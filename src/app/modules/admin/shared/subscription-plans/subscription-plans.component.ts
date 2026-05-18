import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { filter, Subject, switchMap, takeUntil } from 'rxjs';
import {
  SubscriptionPlan,
  SubscriptionPlansAdminService,
} from '@admin/services/subscription-plans-admin.service';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { translations } from '@translations/translations';

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
      features: this.fb.array([]),
    });
  }

  get features(): FormArray {
    return this.planForm.get('features') as FormArray;
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
    this.features.clear();
    this.showForm = true;
    this.cdr.markForCheck();
  }

  openEditForm(plan: SubscriptionPlan): void {
    this.editingPlan = plan;
    this.features.clear();
    plan.features.forEach((f) => this.features.push(this.fb.control(f, Validators.required)));
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

  addFeature(): void {
    this.features.push(this.fb.control('', Validators.required));
    this.cdr.markForCheck();
  }

  removeFeature(index: number): void {
    this.features.removeAt(index);
    this.cdr.markForCheck();
  }

  savePlan(): void {
    if (this.planForm.invalid) return;
    this.isSaving = true;
    const dto = this.planForm.value;

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
