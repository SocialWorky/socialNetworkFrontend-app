import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { filter, Subject, switchMap, takeUntil } from 'rxjs';
import { BoostPackage, BoostPackagesAdminService } from '@admin/services/boost-packages-admin.service';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { translations } from '@translations/translations';

@Component({
  selector: 'worky-boost-packages',
  templateUrl: './boost-packages.component.html',
  styleUrls: ['./boost-packages.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class BoostPackagesComponent implements OnInit, OnDestroy {
  packages: BoostPackage[] = [];
  isLoading = true;
  isSaving = false;
  showForm = false;
  editingPackage: BoostPackage | null = null;

  packageForm: FormGroup;

  private destroy$ = new Subject<void>();

  constructor(
    private readonly service: BoostPackagesAdminService,
    private readonly alertService: AlertService,
    private readonly fb: FormBuilder,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.packageForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', Validators.maxLength(300)],
      priceClp: [null, [Validators.required, Validators.min(1)]],
      durationHours: [null, [Validators.required, Validators.min(1)]],
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.service.loading$.pipe(takeUntil(this.destroy$)).subscribe(l => { this.isLoading = l; this.cdr.markForCheck(); });
    this.service.packages$.pipe(takeUntil(this.destroy$)).subscribe(pkgs => { this.packages = pkgs; this.cdr.markForCheck(); });
    this.service.loadAll().pipe(takeUntil(this.destroy$)).subscribe();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  openCreateForm(): void {
    this.editingPackage = null;
    this.packageForm.reset({ isActive: true });
    this.showForm = true;
    this.cdr.markForCheck();
  }

  openEditForm(pkg: BoostPackage): void {
    this.editingPackage = pkg;
    this.packageForm.patchValue({ name: pkg.name, description: pkg.description ?? '', priceClp: pkg.priceClp, durationHours: pkg.durationHours, isActive: pkg.isActive });
    this.showForm = true;
    this.cdr.markForCheck();
  }

  closeForm(): void { this.showForm = false; this.editingPackage = null; this.cdr.markForCheck(); }

  savePackage(): void {
    if (this.packageForm.invalid) return;
    this.isSaving = true;
    const dto = this.packageForm.value;
    const req$ = this.editingPackage ? this.service.update(this.editingPackage._id, dto) : this.service.create(dto);
    req$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.isSaving = false; this.closeForm(); this.cdr.markForCheck(); },
      error: () => { this.isSaving = false; this.cdr.markForCheck(); },
    });
  }

  deletePackage(pkg: BoostPackage): void {
    this.alertService.showConfirmation(
      translations['admin.boostPackages'],
      translations['admin.boostDeleteConfirm'],
      translations['button.ok'],
      translations['common.close'],
      Alerts.WARNING,
      Position.CENTER,
    ).pipe(filter(Boolean), switchMap(() => this.service.delete(pkg._id)), takeUntil(this.destroy$))
      .subscribe({ next: () => this.cdr.markForCheck() });
  }

  formatPrice(priceClp: number): string {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(priceClp);
  }
}
