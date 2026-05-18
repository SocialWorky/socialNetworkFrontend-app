import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { filter, Subject, switchMap, takeUntil } from 'rxjs';
import {
  SubscriptionPlan,
  SubscriptionPlansAdminService,
} from '@admin/services/subscription-plans-admin.service';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { translations } from '@translations/translations';

const PLATFORM_FEATURES = [
  { id: 'feed', labelKey: 'admin.feature.feed' },
  { id: 'chat', labelKey: 'admin.feature.chat' },
  { id: 'friends', labelKey: 'admin.feature.friends' },
  { id: 'notifications', labelKey: 'admin.feature.notifications' },
  { id: 'profile', labelKey: 'admin.feature.profile' },
  { id: 'media_upload', labelKey: 'admin.feature.media_upload' },
  { id: 'search', labelKey: 'admin.feature.search' },
  { id: 'reactions', labelKey: 'admin.feature.reactions' },
  { id: 'comments', labelKey: 'admin.feature.comments' },
  { id: 'widgets', labelKey: 'admin.feature.widgets' },
];

@Component({
  selector: 'worky-subscription-plans',
  templateUrl: './subscription-plans.component.html',
  styleUrls: ['./subscription-plans.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class SubscriptionPlansComponent implements OnInit, OnDestroy {
  plans: SubscriptionPlan[] = [];
  isLoading = true;
  isSaving = false;

  showForm = false;
  editingPlan: SubscriptionPlan | null = null;

  planForm: FormGroup;
  readonly platformFeatures = PLATFORM_FEATURES;
  selectedFeatures: string[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private readonly plansService: SubscriptionPlansAdminService,
    private readonly alertService: AlertService,
    private readonly fb: FormBuilder,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.planForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', Validators.maxLength(500)],
      priceClp: [null, [Validators.required, Validators.min(1)]],
      durationDays: [null, [Validators.required, Validators.min(1)]],
      isActive: [true],
    });
  }

  isFeatureSelected(id: string): boolean {
    return this.selectedFeatures.includes(id);
  }

  toggleFeature(id: string): void {
    const idx = this.selectedFeatures.indexOf(id);
    if (idx === -1) {
      this.selectedFeatures.push(id);
    } else {
      this.selectedFeatures.splice(idx, 1);
    }
    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    this.plansService.loading$.pipe(takeUntil(this.destroy$)).subscribe((loading) => {
      this.isLoading = loading;
      this.cdr.markForCheck();
    });

    this.plansService.plans$.pipe(takeUntil(this.destroy$)).subscribe((plans) => {
      this.plans = plans;
      this.cdr.markForCheck();
    });

    this.plansService.loadAll().pipe(takeUntil(this.destroy$)).subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openCreateForm(): void {
    this.editingPlan = null;
    this.planForm.reset({ isActive: true });
    this.selectedFeatures = [];
    this.showForm = true;
    this.cdr.markForCheck();
  }

  openEditForm(plan: SubscriptionPlan): void {
    this.editingPlan = plan;
    this.selectedFeatures = [...plan.features];
    this.planForm.patchValue({
      name: plan.name,
      description: plan.description ?? '',
      priceClp: plan.priceClp,
      durationDays: plan.durationDays,
      isActive: plan.isActive,
    });
    this.showForm = true;
    this.cdr.markForCheck();
  }

  closeForm(): void {
    this.showForm = false;
    this.editingPlan = null;
    this.cdr.markForCheck();
  }

  savePlan(): void {
    if (this.planForm.invalid) return;
    this.isSaving = true;
    const dto = { ...this.planForm.value, features: this.selectedFeatures };

    const request$ = this.editingPlan
      ? this.plansService.update(this.editingPlan._id, dto)
      : this.plansService.create(dto);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeForm();
        this.alertService.showAlert(
          translations['admin.subscriptionPlans'],
          this.editingPlan
            ? translations['admin.editPlan']
            : translations['admin.createPlan'],
          Alerts.SUCCESS,
          Position.CENTER,
          true,
          translations['button.ok'],
        );
        this.cdr.markForCheck();
      },
      error: () => {
        this.isSaving = false;
        this.cdr.markForCheck();
      },
    });
  }

  deletePlan(plan: SubscriptionPlan): void {
    this.alertService
      .showConfirmation(
        translations['admin.deletePlan'],
        translations['admin.planDeleteConfirm'],
        translations['button.ok'],
        translations['common.close'],
        Alerts.WARNING,
        Position.CENTER,
      )
      .pipe(
        filter(Boolean),
        switchMap(() => this.plansService.delete(plan._id)),
        takeUntil(this.destroy$),
      )
      .subscribe({ next: () => this.cdr.markForCheck() });
  }

  formatPrice(priceClp: number): string {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(priceClp);
  }
}
