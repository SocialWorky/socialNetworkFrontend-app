import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { TranslationsPipe } from '@shared/modules/translations/pipes/translations.pipe';
import { Subject, takeUntil } from 'rxjs';
import { WidgetTypeService, WidgetType, WidgetField, CreateWidgetTypeDto } from '@shared/modules/worky-widget/service/widget-type.service';
import { WidgetConfigService } from '@shared/modules/worky-widget/service/widget-config.service';
import { WidgetPosition, WidgetStatus } from '@shared/modules/worky-widget/worky-news/interface/widget.interface';
import { AlertService } from '@shared/services/alert.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';
import { translations } from '@translations/translations';
import { MatDialog } from '@angular/material/dialog';
import { ImageUploadModalComponent } from '@shared/modules/image-upload-modal/image-upload-modal.component';
import { FileUploadService } from '@shared/services/core-apis/file-upload.service';
import { TypePublishing } from '@shared/modules/addPublication/enum/addPublication.enum';
import { environment } from '@env/environment';
import { MaterialModule } from '@shared/modules/material/material.module';
import { ImageUploadModalModule } from '@shared/modules/image-upload-modal/image-upload-modal.module';

@Component({
  selector: 'worky-widget-builder',
  templateUrl: './widget-builder.component.html',
  styleUrls: ['./widget-builder.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, FormsModule, TranslationsPipe, MaterialModule, ImageUploadModalModule],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WidgetBuilderComponent implements OnInit, OnDestroy {
  widgetTypes: WidgetType[] = [];
  selectedWidgetType: WidgetType | null = null;
  widgetForm: FormGroup;
  widgetConfigForm: FormGroup;
  isSaving = false;
  isCreatingType = false;
  showTypeForm = false;
  widgetTypeForm: FormGroup;
  editingWidgetType: WidgetType | null = null;
  activeTab: 'create' | 'manage' = 'create';
  fieldTypes = ['text', 'textarea', 'number', 'url', 'image', 'color', 'select', 'checkbox', 'date', 'html'];
  widgetTypeEnum = ['html', 'image', 'text', 'list', 'link', 'iframe', 'custom'];
  editingFields: { [key: number]: WidgetField[] } = {};
  isSavingType = false;

  availablePositions = Object.values(WidgetPosition);
  availableStatuses = Object.values(WidgetStatus);
  uploadingImages: { [key: string]: boolean } = {};

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private widgetTypeService: WidgetTypeService,
    private widgetConfigService: WidgetConfigService,
    private alertService: AlertService,
    private logService: LogService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private fileUploadService: FileUploadService
  ) {
    this.widgetForm = this.fb.group({
      selector: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      name: ['', Validators.required],
      description: ['', Validators.required],
      position: [WidgetPosition.RIGHT, Validators.required],
      order: [0, Validators.required],
      status: [WidgetStatus.ENABLED, Validators.required],
      allowedPositions: [[WidgetPosition.RIGHT], Validators.required],
      icon: [''],
      type: ['custom', Validators.required],
      widgetTypeId: [null, Validators.required],
      showTitle: [true]
    });

    this.widgetConfigForm = this.fb.group({});

    this.widgetTypeForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      type: ['custom', Validators.required],
      icon: [''],
      isActive: [true]
    });
  }

  setActiveTab(tab: 'create' | 'manage'): void {
    this.activeTab = tab as 'create' | 'manage';
    if (tab === 'manage') {
      this.loadAllWidgetTypes();
    }
    this.cdr.markForCheck();
  }

  loadAllWidgetTypes(): void {
    this.widgetTypeService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (types) => {
          this.widgetTypes = types;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.logService.log(
            LevelLogEnum.ERROR,
            'WidgetBuilderComponent',
            'Error loading all widget types',
            { error }
          );
        }
      });
  }

  openTypeForm(type?: WidgetType): void {
    this.editingWidgetType = type || null;
    if (type) {
      this.widgetTypeForm.patchValue({
        name: type.name,
        description: type.description,
        type: type.type,
        icon: type.icon || '',
        isActive: type.isActive !== false
      });
      this.editingFields[type.id!] = [...(type.fields || [])];
    } else {
      this.widgetTypeForm.reset({
        type: 'custom',
        isActive: true
      });
      this.editingFields = {};
    }
    this.showTypeForm = true;
    this.cdr.markForCheck();
  }

  closeTypeForm(): void {
    this.showTypeForm = false;
    this.editingWidgetType = null;
    this.widgetTypeForm.reset({
      type: 'custom',
      isActive: true
    });
    this.editingFields = {};
    this.cdr.markForCheck();
  }

  addFieldToType(typeId?: number): void {
    const id = typeId || this.editingWidgetType?.id || 0;
    if (!this.editingFields[id]) {
      this.editingFields[id] = [];
    }
    this.editingFields[id].push({
      key: '',
      label: '',
      fieldType: 'text',
      required: false,
      order: this.editingFields[id].length
    });
    this.cdr.markForCheck();
  }

  removeFieldFromType(typeId: number, index: number): void {
    if (this.editingFields[typeId]) {
      this.editingFields[typeId].splice(index, 1);
      this.editingFields[typeId].forEach((field, idx) => {
        field.order = idx;
      });
      this.cdr.markForCheck();
    }
  }

  saveWidgetType(): void {
    if (this.widgetTypeForm.invalid) {
      this.showAlert(translations['admin.widgetBuilder.typeForm.alerts.requiredFields'], 'warning');
      return;
    }

    const typeId = this.editingWidgetType?.id;
    const fields = typeId ? this.editingFields[typeId] || [] : [];
    
    if (fields.length === 0) {
      this.showAlert(translations['admin.widgetBuilder.typeForm.alerts.noFields'], 'warning');
      return;
    }

    for (const field of fields) {
      if (!field.key || !field.label) {
        this.showAlert(translations['admin.widgetBuilder.typeForm.alerts.incompleteFields'], 'warning');
        return;
      }
    }

    this.isSavingType = true;
    this.cdr.markForCheck();

    const typeData: CreateWidgetTypeDto = {
      ...this.widgetTypeForm.getRawValue(),
      fields: fields.map(f => ({
        key: f.key,
        label: f.label,
        fieldType: f.fieldType,
        required: f.required || false,
        placeholder: f.placeholder || '',
        defaultValue: f.defaultValue || '',
        options: f.options || [],
        validation: f.validation,
        order: f.order || 0
      }))
    };

    const operation = typeId
      ? this.widgetTypeService.update(typeId, typeData)
      : this.widgetTypeService.create(typeData);

    operation
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSavingType = false;
          this.showAlert(
            typeId 
              ? translations['admin.widgetBuilder.typeForm.alerts.success.updated']
              : translations['admin.widgetBuilder.typeForm.alerts.success.created'],
            'success'
          );
          this.closeTypeForm();
          this.loadAllWidgetTypes();
          this.loadWidgetTypes();
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.isSavingType = false;
          this.logService.log(
            LevelLogEnum.ERROR,
            'WidgetBuilderComponent',
            'Error saving widget type',
            { error }
          );
          this.showAlert(translations['admin.widgetBuilder.typeForm.alerts.error.save'], 'error');
          this.cdr.markForCheck();
        }
      });
  }

  deleteWidgetType(type: WidgetType): void {
    if (!type.id) return;

    this.alertService.showConfirmation(
      translations['admin.widgetBuilder.typeForm.alerts.confirm.delete'],
      translations['admin.widgetBuilder.typeForm.alerts.confirm.deleteMessage'],
      translations['button.delete'],
      translations['button.cancel']
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.widgetTypeService.delete(type.id!)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.showAlert(translations['admin.widgetBuilder.typeForm.alerts.success.deleted'], 'success');
                this.loadAllWidgetTypes();
                this.loadWidgetTypes();
                this.cdr.markForCheck();
              },
              error: (error) => {
                this.logService.log(
                  LevelLogEnum.ERROR,
                  'WidgetBuilderComponent',
                  'Error deleting widget type',
                  { error }
                );
                this.showAlert(translations['admin.widgetBuilder.typeForm.alerts.error.delete'], 'error');
                this.cdr.markForCheck();
              }
            });
        }
      });
  }

  editWidgetType(type: WidgetType): void {
    this.openTypeForm(type);
  }

  isManageTab(): boolean {
    return this.activeTab === 'manage';
  }

  isCreateTab(): boolean {
    return this.activeTab === 'create';
  }

  ngOnInit(): void {
    this.activeTab = 'create';
    this.loadWidgetTypes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadWidgetTypes(): void {
    this.widgetTypeService.getActive()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (types) => {
          if (types.length === 0) {
            this.initializeDefaultTypes();
          } else {
            this.widgetTypes = types;
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          this.logService.log(
            LevelLogEnum.ERROR,
            'WidgetBuilderComponent',
            'Error loading widget types',
            { error }
          );
          this.showAlert(translations['admin.widgetBuilder.alerts.error.loadTypes'], 'error');
        }
      });
  }

  initializeDefaultTypes(): void {
    this.widgetTypeService.initializeDefaults()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadWidgetTypes();
        },
        error: (error) => {
          this.logService.log(
            LevelLogEnum.ERROR,
            'WidgetBuilderComponent',
            'Error initializing default widget types',
            { error }
          );
        }
      });
  }

  selectWidgetType(type: WidgetType): void {
    this.selectedWidgetType = type;
    this.widgetForm.patchValue({
      widgetTypeId: type.id,
      type: type.type,
      icon: type.icon || ''
    });

    this.buildConfigForm(type.fields || []);
    this.cdr.markForCheck();
  }

  buildConfigForm(fields: WidgetField[]): void {
    const configGroup: any = {};
    
    fields.forEach(field => {
      const validators = [];
      if (field.required) {
        validators.push(Validators.required);
      }
      if (field.validation?.minLength) {
        validators.push(Validators.minLength(field.validation.minLength));
      }
      if (field.validation?.maxLength) {
        validators.push(Validators.maxLength(field.validation.maxLength));
      }
      if (field.validation?.min !== undefined) {
        validators.push(Validators.min(field.validation.min));
      }
      if (field.validation?.max !== undefined) {
        validators.push(Validators.max(field.validation.max));
      }
      if (field.validation?.pattern) {
        validators.push(Validators.pattern(field.validation.pattern));
      }

      configGroup[field.key] = [field.defaultValue || '', validators];
    });

    this.widgetConfigForm = this.fb.group(configGroup);
    this.cdr.markForCheck();
  }

  togglePosition(position: WidgetPosition): void {
    const currentPositions = this.widgetForm.get('allowedPositions')?.value || [];
    const index = currentPositions.indexOf(position);
    
    if (index > -1) {
      currentPositions.splice(index, 1);
    } else {
      currentPositions.push(position);
    }
    
    this.widgetForm.patchValue({ allowedPositions: currentPositions });
  }

  isPositionAllowed(position: WidgetPosition): boolean {
    const allowedPositions = this.widgetForm.get('allowedPositions')?.value || [];
    return allowedPositions.includes(position);
  }

  generateSelector(): void {
    const name = this.widgetForm.get('name')?.value;
    if (name) {
      const selector = 'worky-' + name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      this.widgetForm.patchValue({ selector });
    }
  }

  saveWidget(): void {
    if (this.widgetForm.invalid || this.widgetConfigForm.invalid) {
      this.showAlert(translations['admin.widgetBuilder.alerts.warning.requiredFields'], 'warning');
      return;
    }

    this.isSaving = true;
    this.cdr.markForCheck();

    const formValue = this.widgetForm.getRawValue();
    const configValue = this.widgetConfigForm.getRawValue();

    // Merge showTitle into config
    const mergedConfig = {
      ...configValue,
      showTitle: formValue.showTitle !== undefined ? formValue.showTitle : true
    };

    // Prepare widget data according to CreateWidgetDto
    const widgetData = {
      selector: formValue.selector,
      name: formValue.name,
      description: formValue.description || '', // Ensure description is not empty
      position: formValue.position,
      order: formValue.order,
      status: formValue.status,
      allowedPositions: formValue.allowedPositions,
      icon: formValue.icon || undefined,
      type: formValue.type || undefined,
      config: Object.keys(mergedConfig).length > 0 ? mergedConfig : undefined
    };

    this.widgetConfigService.createWidget(widgetData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.showAlert(translations['admin.widgetBuilder.alerts.success.created'], 'success');
          this.resetForm();
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.isSaving = false;
          this.logService.log(
            LevelLogEnum.ERROR,
            'WidgetBuilderComponent',
            'Error creating widget',
            { error }
          );
          this.showAlert(translations['admin.widgetBuilder.alerts.error.create'], 'error');
          this.cdr.markForCheck();
        }
      });
  }

  resetForm(): void {
    this.selectedWidgetType = null;
    this.widgetForm.reset({
      position: WidgetPosition.RIGHT,
      order: 0,
      status: WidgetStatus.ENABLED,
      allowedPositions: [WidgetPosition.RIGHT],
      type: 'custom',
      showTitle: true
    });
    this.widgetConfigForm = this.fb.group({});
    this.cdr.markForCheck();
  }

  showAlert(message: string, type: 'success' | 'error' | 'warning' = 'success'): void {
    const alertType = type === 'success' ? Alerts.SUCCESS : type === 'error' ? Alerts.ERROR : Alerts.WARNING;
    const closeButtonText = translations['button.close'] || 'Close';
    this.alertService.showAlert(
      type,
      message,
      alertType,
      Position.CENTER,
      true,
      closeButtonText
    );
  }

  openImageUpload(fieldKey: string): void {
    const dialogRef = this.dialog.open(ImageUploadModalComponent, {
      data: { maxFiles: 1 },
      width: '90%',
      maxWidth: '600px'
    });

    dialogRef.afterClosed().subscribe((files: File[]) => {
      if (files && files.length > 0) {
        this.uploadImage(files[0], fieldKey);
      }
    });
  }

  uploadImage(file: File, fieldKey: string): void {
    this.uploadingImages[fieldKey] = true;
    this.cdr.markForCheck();

    this.fileUploadService.uploadFile(
      [file],
      'widgets',
      null,
      null,
      TypePublishing.PROFILE_IMG
    ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        if (response && typeof response === 'object' && response.files && Array.isArray(response.files) && response.files.length > 0) {
          const uploadedFile = response.files[0];

          // Use the relative path returned by the file service
          let imageUrl: string | null = uploadedFile.url || null;

          if (!imageUrl && uploadedFile.filename) {
            const destination = 'widgets';
            imageUrl = `${destination}/${uploadedFile.filename}`;
          }

          if (imageUrl) {
            imageUrl = imageUrl.trim();
            this.widgetConfigForm.patchValue({ [fieldKey]: imageUrl });
            this.uploadingImages[fieldKey] = false;
            this.showAlert(translations['admin.widgetBuilder.config.image.uploadSuccess'] || 'Image uploaded successfully', 'success');
            this.cdr.markForCheck();
          } else {
            this.uploadingImages[fieldKey] = false;
            this.logService.log(
              LevelLogEnum.ERROR,
              'WidgetBuilderComponent',
              'No URL or filename found in upload response',
              { response, uploadedFile }
            );
            this.showAlert(translations['admin.widgetBuilder.config.image.uploadError'] || 'Error uploading image', 'error');
            this.cdr.markForCheck();
          }
        } else {
          this.uploadingImages[fieldKey] = false;
          this.logService.log(
            LevelLogEnum.ERROR,
            'WidgetBuilderComponent',
            'Invalid response structure from upload',
            { response }
          );
          this.showAlert(translations['admin.widgetBuilder.config.image.uploadError'] || 'Error uploading image', 'error');
          this.cdr.markForCheck();
        }
      },
      error: (error) => {
        this.uploadingImages[fieldKey] = false;
        this.logService.log(
          LevelLogEnum.ERROR,
          'WidgetBuilderComponent',
          'Error uploading image',
          { error }
        );
        this.showAlert(translations['admin.widgetBuilder.config.image.uploadError'] || 'Error uploading image', 'error');
        this.cdr.markForCheck();
      }
    });
  }

  isUploadingImage(fieldKey: string): boolean {
    return this.uploadingImages[fieldKey] || false;
  }

  getImageUrl(fieldKey: string): string | null {
    return this.widgetConfigForm.get(fieldKey)?.value || null;
  }

  getImagePlaceholder(field: WidgetField): string {
    return field.placeholder || (translations['admin.widgetBuilder.config.image.urlPlaceholder'] || 'Image URL or upload a new one');
  }

  clearImageUrl(fieldKey: string): void {
    this.widgetConfigForm.patchValue({ [fieldKey]: '' });
    this.cdr.markForCheck();
  }

  getEditingFields(): WidgetField[] {
    if (this.editingWidgetType && this.editingWidgetType.id) {
      return this.editingFields[this.editingWidgetType.id] || [];
    }
    return this.editingFields[0] || [];
  }

  isImageField(field: WidgetField): boolean {
    // Check if field type is 'image' or if it's a 'url' field related to images
    if (field.fieldType === 'image') {
      return true;
    }
    // Check if it's a URL field that's likely for images (based on key or label)
    if (field.fieldType === 'url') {
      const key = field.key?.toLowerCase() || '';
      const label = field.label?.toLowerCase() || '';
      return key.includes('image') || label.includes('image') || key.includes('img') || label.includes('img');
    }
    return false;
  }
}
