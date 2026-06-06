import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslationsModule } from '@shared/modules/translations/translations.module';
import { Subject, takeUntil } from 'rxjs';
import { ThematicImageService, ThematicImage } from '@shared/modules/worky-widget/thematic-image-widget/service/thematic-image.service';
import { AlertService } from '@shared/services/alert.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { FileUploadService } from '@shared/services/core-apis/file-upload.service';
import { MatDialog } from '@angular/material/dialog';
import { ImageUploadModalComponent } from '@shared/modules/image-upload-modal/image-upload-modal.component';
import { MaterialModule } from '@shared/modules/material/material.module';
import { ImageUploadModalModule } from '@shared/modules/image-upload-modal/image-upload-modal.module';
import { environment } from '@env/environment';
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { translations } from '@translations/translations';
import { UtilityService } from '@shared/services/utility.service';

@Component({
  selector: 'worky-thematic-image-management',
  templateUrl: './thematic-image-management.component.html',
  styleUrls: ['./thematic-image-management.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, TranslationsModule, MaterialModule, ImageUploadModalModule],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ThematicImageManagementComponent implements OnInit, OnDestroy {
  imageForm: FormGroup;
  images: ThematicImage[] = [];
  editingImage: ThematicImage | null = null;
  isSaving = false;
  isDeleting = false;
  uploading = false;
  selectedImageUrl: string | null = null;

  daysOfWeek = [
    { value: 0, labelKey: 'admin.thematicImages.form.daysOfWeek.sunday' },
    { value: 1, labelKey: 'admin.thematicImages.form.daysOfWeek.monday' },
    { value: 2, labelKey: 'admin.thematicImages.form.daysOfWeek.tuesday' },
    { value: 3, labelKey: 'admin.thematicImages.form.daysOfWeek.wednesday' },
    { value: 4, labelKey: 'admin.thematicImages.form.daysOfWeek.thursday' },
    { value: 5, labelKey: 'admin.thematicImages.form.daysOfWeek.friday' },
    { value: 6, labelKey: 'admin.thematicImages.form.daysOfWeek.saturday' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private thematicImageService: ThematicImageService,
    private fileUploadService: FileUploadService,
    private alertService: AlertService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private logService: LogService,
    private utilityService: UtilityService
  ) {
    this.imageForm = this.fb.group({
      name: ['', Validators.required],
      imageUrl: ['', Validators.required],
      redirectUrl: [''],
      daysOfWeek: [[]],
      slideDuration: [5, [Validators.required, Validators.min(1), Validators.max(60)]],
      altText: [''],
      isActive: [true],
      displayOrder: [0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    this.loadImages();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Get normalized image URL for display
   */
  getNormalizedImageUrl(imageUrl: string): string {
    if (!imageUrl) return '';
    return this.utilityService.normalizeImageUrl(imageUrl, environment.MINIO_BUCKET_URL || '');
  }

  loadImages(): void {
    this.thematicImageService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (images) => {
          // Normalize daysOfWeek from backend (TypeORM simple-array can return string or array)
          this.images = images.map(img => {
            const normalized = this.normalizeDaysOfWeek(img.daysOfWeek);
            return {
              ...img,
              daysOfWeek: normalized
            };
          }).sort((a, b) => a.displayOrder - b.displayOrder);
          
          // Force change detection
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.logService.log(
            LevelLogEnum.ERROR,
            'ThematicImageManagementComponent',
            'Error loading images',
            { error }
          );
          this.showAlert(translations['admin.thematicImages.alerts.error.load'], 'error');
          this.cdr.markForCheck();
        }
      });
  }

  private normalizeDaysOfWeek(daysOfWeek: any): number[] {
    if (!daysOfWeek) {
      return [];
    }
    
    // If it's already an array, convert to numbers
    if (Array.isArray(daysOfWeek)) {
      const normalized = daysOfWeek
        .map(day => typeof day === 'string' ? parseInt(day.trim(), 10) : Number(day))
        .filter(day => !isNaN(day) && day >= 0 && day <= 6);
      return normalized;
    }
    
    // If it's a string (comma-separated from TypeORM simple-array)
    if (typeof daysOfWeek === 'string') {
      const normalized = daysOfWeek
        .split(',')
        .map(day => parseInt(day.trim(), 10))
        .filter(day => !isNaN(day) && day >= 0 && day <= 6);
      return normalized;
    }
    
    return [];
  }

  openImageUpload(): void {
    const dialogRef = this.dialog.open(ImageUploadModalComponent, {
      data: { maxFiles: 1 }
    });

    dialogRef.afterClosed().subscribe((files: File[]) => {
      if (files && files.length > 0) {
        this.uploadImage(files[0]);
      }
    });
  }

  uploadImage(file: File): void {
    this.uploading = true;
    this.cdr.markForCheck();

    // Use PROFILE_IMG type for synchronous processing that returns URL immediately
    this.fileUploadService.uploadFile(
      [file],
      'thematic-images',
      null,
      null,
      TypePublishing.PROFILE_IMG
    ).subscribe({
      next: (response) => {
        // Handle the actual response structure: {message: string, files: Array}
        if (response && typeof response === 'object' && response.files && Array.isArray(response.files) && response.files.length > 0) {
          const uploadedFile = response.files[0];
          
          // Build URL correctly using server pattern: /:type/:filename
          // Server expects: APIFILESERVICE + destination + '/' + filename
          let imageUrl: string | null = null;
          
          // Use the relative path returned by the file service
          imageUrl = uploadedFile.url || null;

          if (!imageUrl && uploadedFile.filename) {
            const destination = 'thematic-images';
            imageUrl = `${destination}/${uploadedFile.filename}`;
          }
          
          if (imageUrl) {
            // Ensure URL is clean
            imageUrl = imageUrl.trim();
            
            this.selectedImageUrl = imageUrl;
            this.imageForm.patchValue({ imageUrl: imageUrl });
            this.uploading = false;
            this.showAlert(translations['admin.thematicImages.alerts.success.upload'], 'success');
            
            // Force change detection
            this.cdr.detectChanges();
          } else {
            this.uploading = false;
            this.logService.log(
              LevelLogEnum.ERROR,
              'ThematicImageManagementComponent',
              'No URL or filename found in upload response',
              { response, uploadedFile }
            );
            this.showAlert(translations['admin.thematicImages.alerts.error.uploadNoUrl'], 'error');
            this.cdr.markForCheck();
          }
        } else {
          this.uploading = false;
          this.logService.log(
            LevelLogEnum.ERROR,
            'ThematicImageManagementComponent',
            'Invalid response structure from upload',
            { response }
          );
          this.showAlert(translations['admin.thematicImages.alerts.error.uploadInvalidResponse'], 'error');
          this.cdr.markForCheck();
        }
      },
      error: (error) => {
        this.uploading = false;
        this.logService.log(
          LevelLogEnum.ERROR,
          'ThematicImageManagementComponent',
          'Error uploading image',
          { error }
        );
        this.showAlert(translations['admin.thematicImages.alerts.error.upload'], 'error');
        this.cdr.markForCheck();
      }
    });
  }

  toggleDay(day: number): void {
    const currentDays = this.imageForm.get('daysOfWeek')?.value || [];
    // Create a new array to avoid mutation issues
    const newDays = [...currentDays];
    const index = newDays.indexOf(day);
    
    if (index > -1) {
      newDays.splice(index, 1);
    } else {
      newDays.push(day);
    }
    
    // Sort and update form
    const sortedDays = newDays.sort((a, b) => a - b);
    this.imageForm.patchValue({ daysOfWeek: sortedDays });
    this.cdr.markForCheck();
  }

  isDaySelected(day: number): boolean {
    const currentDays = this.imageForm.get('daysOfWeek')?.value || [];
    // Ensure we're comparing numbers
    const normalizedDays = Array.isArray(currentDays) 
      ? currentDays.map(d => typeof d === 'string' ? parseInt(d, 10) : Number(d))
      : [];
    return normalizedDays.includes(day);
  }

  editImage(image: ThematicImage): void {
    this.editingImage = image;
    this.selectedImageUrl = image.imageUrl;
    
    // Normalize daysOfWeek to ensure it's an array of numbers
    const normalizedDays = this.normalizeDaysOfWeek(image.daysOfWeek);
    
    // Create a copy of the array to avoid reference issues
    const daysCopy = [...normalizedDays];
    
    // Reset form first to ensure clean state
    this.imageForm.reset({
      name: image.name,
      imageUrl: image.imageUrl,
      redirectUrl: image.redirectUrl || '',
      daysOfWeek: daysCopy,
      slideDuration: image.slideDuration,
      altText: image.altText || '',
      isActive: image.isActive,
      displayOrder: image.displayOrder
    });
    
    // Force change detection
    this.cdr.detectChanges();
  }

  cancelEdit(): void {
    this.editingImage = null;
    this.selectedImageUrl = null;
    this.imageForm.reset({
      name: '',
      imageUrl: '',
      redirectUrl: '',
      daysOfWeek: [],
      slideDuration: 5,
      altText: '',
      isActive: true,
      displayOrder: 0
    });
    this.cdr.markForCheck();
  }

  saveImage(): void {
    if (this.imageForm.invalid) {
      this.showAlert(translations['admin.thematicImages.alerts.warning.requiredFields'], 'warning');
      return;
    }

    this.isSaving = true;
    this.cdr.markForCheck();

    // Get fresh form value to ensure we have the latest data
    const formValue = { ...this.imageForm.getRawValue() };
    
    // Ensure daysOfWeek is properly formatted as array of numbers
    let daysOfWeek: number[] | null | undefined = formValue.daysOfWeek;
    
    if (Array.isArray(daysOfWeek) && daysOfWeek.length > 0) {
      // Filter out any invalid values and ensure they are numbers
      daysOfWeek = daysOfWeek
        .map(day => typeof day === 'number' ? day : parseInt(String(day), 10))
        .filter(day => !isNaN(day) && day >= 0 && day <= 6)
        .sort((a, b) => a - b); // Ensure sorted
      
      // If array is empty after filtering, set to null (means all days)
      if (daysOfWeek.length === 0) {
        daysOfWeek = null;
      }
    } else {
      // If empty array or not an array, set to null (means all days)
      daysOfWeek = null;
    }
    
    const imageData: Partial<ThematicImage> = {
      name: formValue.name,
      imageUrl: formValue.imageUrl,
      redirectUrl: formValue.redirectUrl || undefined,
      daysOfWeek: daysOfWeek,
      slideDuration: formValue.slideDuration,
      altText: formValue.altText || undefined,
      isActive: formValue.isActive !== undefined ? formValue.isActive : true,
      displayOrder: formValue.displayOrder || 0
    };

    const operation = this.editingImage
      ? this.thematicImageService.update(this.editingImage.id, imageData)
      : this.thematicImageService.create(imageData);

    operation.pipe(takeUntil(this.destroy$)).subscribe({
      next: (savedImage) => {
        this.isSaving = false;
        const successMessage = this.editingImage 
          ? translations['admin.thematicImages.alerts.success.updated']
          : translations['admin.thematicImages.alerts.success.created'];
        this.showAlert(successMessage, 'success');
        
        // Cancel edit first
        this.cancelEdit();
        
        // Force reload images immediately - cache should be invalidated by interceptor
        // But add a small delay to ensure backend has fully processed
        setTimeout(() => {
          this.loadImages();
        }, 200);
      },
      error: (error) => {
        this.isSaving = false;
        this.logService.log(
          LevelLogEnum.ERROR,
          'ThematicImageManagementComponent',
          'Error saving image',
          { error, imageData }
        );
        const errorMessage = error?.error?.message || error?.message || translations['admin.thematicImages.alerts.error.save'];
        this.showAlert(errorMessage, 'error');
        this.cdr.markForCheck();
      }
    });
  }

  deleteImage(image: ThematicImage): void {
    const confirmMessage = translations['admin.thematicImages.alerts.confirm.delete'].replace('{{name}}', image.name);
    const confirmButtonText = translations['button.delete'] || 'Eliminar';
    const cancelButtonText = translations['button.cancel'] || 'Cancelar';

    this.alertService.showConfirmation(
      '',
      confirmMessage,
      confirmButtonText,
      cancelButtonText,
      Alerts.QUESTION,
      Position.CENTER
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (confirmed: boolean) => {
        if (!confirmed) {
          return;
        }

        this.isDeleting = true;
        this.cdr.markForCheck();

        this.thematicImageService.delete(image.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.isDeleting = false;
              this.showAlert(translations['admin.thematicImages.alerts.success.deleted'], 'success');
              this.loadImages();
            },
            error: (error) => {
              this.isDeleting = false;
              this.logService.log(
                LevelLogEnum.ERROR,
                'ThematicImageManagementComponent',
                'Error deleting image',
                { error }
              );
              this.showAlert(translations['admin.thematicImages.alerts.error.delete'], 'error');
              this.cdr.markForCheck();
            }
          });
      }
    });
  }

  toggleActive(image: ThematicImage): void {
    this.thematicImageService.toggleActive(image.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const toggleMessage = image.isActive 
            ? translations['admin.thematicImages.alerts.success.deactivated']
            : translations['admin.thematicImages.alerts.success.activated'];
          this.showAlert(toggleMessage, 'success');
          this.loadImages();
        },
        error: (error) => {
          this.logService.log(
            LevelLogEnum.ERROR,
            'ThematicImageManagementComponent',
            'Error toggling image active status',
            { error }
          );
          this.showAlert(translations['admin.thematicImages.alerts.error.toggleStatus'], 'error');
        }
      });
  }

  showAlert(message: string, type: 'success' | 'error' | 'warning' = 'success'): void {
    const alertType = type === 'success' ? Alerts.SUCCESS : type === 'error' ? Alerts.ERROR : Alerts.WARNING;
    const closeButtonText = translations['button.close'] || 'Cerrar';
    this.alertService.showAlert(
      type,
      message,
      alertType,
      Position.CENTER,
      true,
      closeButtonText
    );
  }

  getSelectedDaysLabel(): string {
    const selectedDays = this.imageForm.get('daysOfWeek')?.value || [];
    if (selectedDays.length === 0) {
      return translations['admin.thematicImages.form.daysOfWeek.allDays'] || 'Todos los días';
    }
    return selectedDays
      .map((day: number) => {
        const dayObj = this.daysOfWeek.find(d => d.value === day);
        return dayObj ? translations[dayObj.labelKey] || '' : '';
      })
      .filter((label: string) => label !== '')
      .join(', ');
  }

  getImageDaysLabel(image: ThematicImage): string {
    const normalizedDays = this.normalizeDaysOfWeek(image.daysOfWeek);
    if (normalizedDays.length === 0) {
      return translations['admin.thematicImages.form.daysOfWeek.allDays'] || 'Todos los días';
    }
    return normalizedDays
      .map((day: number) => {
        const dayObj = this.daysOfWeek.find(d => d.value === day);
        return dayObj ? translations[dayObj.labelKey] || '' : '';
      })
      .filter((label: string) => label !== '')
      .join(', ');
  }

  onImageError(event: any): void {
    this.logService.log(
      LevelLogEnum.ERROR,
      'ThematicImageManagementComponent',
      'Error loading image preview',
      { url: this.selectedImageUrl, error: event }
    );
  }

  onImageLoad(event: any): void {
    // Image loaded successfully
  }
}
