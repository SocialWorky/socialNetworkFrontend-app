import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';
import {
  AdminSubscription,
  SubscriptionsAdminService,
  UserSearchResult,
} from '../../services/subscriptions-admin.service';
import { SubscriptionPlansAdminService, SubscriptionPlan } from '../../services/subscription-plans-admin.service';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { translations } from '@translations/translations';

const STATUS_LABELS: Record<string, { label: string; cssClass: string }> = {
  active:    { label: 'Activa',    cssClass: 'badge-active' },
  pending:   { label: 'Pendiente', cssClass: 'badge-pending' },
  expired:   { label: 'Expirada',  cssClass: 'badge-expired' },
  cancelled: { label: 'Cancelada', cssClass: 'badge-cancelled' },
  failed:    { label: 'Fallida',   cssClass: 'badge-failed' },
};

@Component({
  selector: 'worky-manage-subscriptions',
  templateUrl: './manage-subscriptions.component.html',
  styleUrls: ['./manage-subscriptions.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ManageSubscriptionsComponent implements OnInit, OnDestroy {
  // Table state
  subscriptions: AdminSubscription[] = [];
  total = 0;
  page = 1;
  limit = 20;
  isLoading = true;

  // Filters
  selectedStatus = '';
  searchQuery = '';
  readonly statuses = ['', 'active', 'pending', 'expired', 'cancelled', 'failed'];
  readonly statusLabels = STATUS_LABELS;

  // Detail modal
  selectedSubscription: AdminSubscription | null = null;
  get showDetailModal(): boolean { return !!this.selectedSubscription; }

  openDetail(sub: AdminSubscription): void {
    this.selectedSubscription = sub;
    this.cdr.markForCheck();
  }

  closeDetail(): void {
    this.selectedSubscription = null;
    this.cdr.markForCheck();
  }

  // Assign modal
  showAssignModal = false;
  isAssigning = false;
  assignForm: FormGroup;
  plans: SubscriptionPlan[] = [];
  userSearchResults: UserSearchResult[] = [];
  selectedUser: UserSearchResult | null = null;
  isSearchingUsers = false;
  private userSearch$ = new Subject<string>();

  readonly t = translations;
  private destroy$ = new Subject<void>();

  constructor(
    private readonly svc: SubscriptionsAdminService,
    private readonly plansSvc: SubscriptionPlansAdminService,
    private readonly fb: FormBuilder,
    private readonly alertService: AlertService,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.assignForm = this.fb.group({
      userQuery: [''],
      planId: ['', Validators.required],
      note: [''],
    });
  }

  ngOnInit(): void {
    this.loadSubscriptions();
    this.plansSvc.loadAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (plans) => { this.plans = plans; this.cdr.markForCheck(); },
    });

    // Debounced user search
    this.userSearch$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap((q) => {
        this.isSearchingUsers = true;
        this.cdr.markForCheck();
        return this.svc.searchUsers(q);
      }),
      takeUntil(this.destroy$),
    ).subscribe({
      next: (users) => {
        this.userSearchResults = users;
        this.isSearchingUsers = false;
        this.cdr.markForCheck();
      },
      error: () => { this.isSearchingUsers = false; this.cdr.markForCheck(); },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSubscriptions(): void {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.svc.list(this.page, this.limit, this.selectedStatus || undefined, this.searchQuery || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ data, total }) => {
          this.subscriptions = data;
          this.total = total;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => { this.isLoading = false; this.cdr.markForCheck(); },
      });
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.page = 1;
    this.loadSubscriptions();
  }

  onStatusChange(status: string): void {
    this.selectedStatus = status;
    this.page = 1;
    this.loadSubscriptions();
  }

  onPageChange(newPage: number): void {
    this.page = newPage;
    this.loadSubscriptions();
  }

  get totalPages(): number {
    return Math.ceil(this.total / this.limit);
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  activate(sub: AdminSubscription): void {
    this.alertService.showConfirmation(
      '¿Activar suscripción?',
      `Esto activará la suscripción de ${sub.user?.username ?? sub.userId} con el plan "${sub.plan.name}".`,
      'Activar', 'Cancelar', Alerts.QUESTION,
    ).pipe(takeUntil(this.destroy$)).subscribe((confirmed) => {
      if (!confirmed) return;
      this.svc.activate(sub._id).pipe(takeUntil(this.destroy$)).subscribe({
        next: (updated) => {
          this.replaceInList(updated);
          this.alertService.showAlert('Activada', 'La suscripción fue activada.', Alerts.SUCCESS, Position.CENTER, true, 'OK');
        },
      });
    });
  }

  cancel(sub: AdminSubscription): void {
    this.alertService.showConfirmation(
      '¿Cancelar suscripción?',
      `Esto cancelará la suscripción de ${sub.user?.username ?? sub.userId}.`,
      'Cancelar suscripción', 'Volver', Alerts.WARNING,
    ).pipe(takeUntil(this.destroy$)).subscribe((confirmed) => {
      if (!confirmed) return;
      this.svc.cancel(sub._id).pipe(takeUntil(this.destroy$)).subscribe({
        next: (updated) => {
          this.replaceInList(updated);
          this.alertService.showAlert('Cancelada', 'La suscripción fue cancelada.', Alerts.SUCCESS, Position.CENTER, true, 'OK');
        },
      });
    });
  }

  // ─── Assign modal ─────────────────────────────────────────────────────────────

  openAssignModal(): void {
    this.showAssignModal = true;
    this.selectedUser = null;
    this.userSearchResults = [];
    this.assignForm.reset({ userQuery: '', planId: '', note: '' });
    this.cdr.markForCheck();
  }

  closeAssignModal(): void {
    this.showAssignModal = false;
    this.cdr.markForCheck();
  }

  onUserQueryChange(value: string): void {
    this.selectedUser = null;
    if (value.trim().length >= 2) {
      this.userSearch$.next(value.trim());
    } else {
      this.userSearchResults = [];
      this.cdr.markForCheck();
    }
  }

  selectUser(user: UserSearchResult): void {
    this.selectedUser = user;
    this.assignForm.patchValue({ userQuery: `${user.username} (${user.email})` });
    this.userSearchResults = [];
    this.cdr.markForCheck();
  }

  submitAssign(): void {
    if (!this.selectedUser || !this.assignForm.get('planId')?.value) return;
    this.isAssigning = true;
    this.cdr.markForCheck();

    this.svc.assign(this.selectedUser._id, this.assignForm.get('planId')!.value, this.assignForm.get('note')?.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isAssigning = false;
          this.closeAssignModal();
          this.loadSubscriptions();
          this.alertService.showAlert('Asignada', 'La suscripción fue asignada y activada.', Alerts.SUCCESS, Position.CENTER, true, 'OK');
        },
        error: (err) => {
          this.isAssigning = false;
          this.cdr.markForCheck();
          this.alertService.showAlert('Error', err?.error?.message ?? 'No se pudo asignar la suscripción.', Alerts.ERROR, Position.CENTER, true, 'OK');
        },
      });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private replaceInList(updated: AdminSubscription): void {
    this.subscriptions = this.subscriptions.map((s) => (s._id === updated._id ? { ...s, ...updated } : s));
    this.cdr.markForCheck();
  }

  getStatusBadge(status: string): { label: string; cssClass: string } {
    return STATUS_LABELS[status] ?? { label: status, cssClass: '' };
  }

  formatPrice(clp: number): string {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(clp);
  }

  formatDate(date: string | null): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  canActivate(sub: AdminSubscription): boolean {
    return sub.status === 'pending' || sub.status === 'failed';
  }

  canCancel(sub: AdminSubscription): boolean {
    return sub.status === 'active' || sub.status === 'pending';
  }

  countByStatus(status: string): number {
    return this.subscriptions.filter((s) => s.status === status).length;
  }
}
