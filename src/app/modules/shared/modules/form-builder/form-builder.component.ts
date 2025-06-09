import { Component, ChangeDetectorRef, OnInit, Renderer2, OnDestroy } from '@angular/core';
import { CdkDragDrop, CdkDragEnd, CdkDragStart, moveItemInArray } from '@angular/cdk/drag-drop';
import { FormGroup, FormControl } from '@angular/forms';
import { MatSelectChange } from '@angular/material/select';
import { map, Subject, takeUntil } from 'rxjs';

import { Field } from './interfaces/field.interface';
import { CustomFieldType, CustomFieldDestination, CustomField} from './interfaces/custom-field.interface';
import { CustomFieldService } from '@shared/services/core-apis/custom-field.service';

@Component({
    selector: 'worky-form-builder',
    templateUrl: './form-builder.component.html',
    styleUrls: ['./form-builder.component.scss'],
    standalone: false
})
export class FormBuilderComponent implements OnInit, OnDestroy {
  form: FormGroup = new FormGroup({});

  selectedField: Field | null = null;

  idError = false;

  selectedFieldIndex: number | null = null;

  formDestination: CustomFieldDestination = CustomFieldDestination.PROFILE;

  enumCustomFieldType = CustomFieldType;

  availableFields: Field[] = [
    { type: CustomFieldType.TEXT, id: this.generateId(), idName: '', label: 'Campo de Texto', destination: CustomFieldDestination.PROFILE },
    { type: CustomFieldType.TEXTAREA, id: this.generateId(), idName: '', label: 'Área de Texto', destination: CustomFieldDestination.PROFILE },
    { type: CustomFieldType.SELECT, id: this.generateId(), idName: '', label: 'Select', options: [], destination: CustomFieldDestination.PROFILE },
  ];

  formFields: Field[] = [];

  customFieldDestinations = Object.values(CustomFieldDestination);

  private destroy$ = new Subject<void>();

  constructor(
    private _cdr: ChangeDetectorRef,
    private _renderer: Renderer2,
    private _customFieldService: CustomFieldService
  ) { }

  ngOnInit() {
    this.formDestination = this.customFieldDestinations[0];
    this.form = new FormGroup({
      id: new FormControl(''),
      idName: new FormControl(''),
      label: new FormControl(''),
      isActive: new FormControl(false),
      placeholder: new FormControl(''),
      optionsString: new FormControl(''),
      destination: new FormControl(CustomFieldDestination.PROFILE),
      additionalOptions: new FormGroup({
        multiSelect: new FormControl(false),
        visible: new FormControl(true),
        required: new FormControl(false),
        minLength: new FormControl(0),
        maxLength: new FormControl(50)
      })
    });

    setTimeout(() => {
      this.getFields();
    }, 100);

    this._cdr.markForCheck();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getFields(): void {
    this.formFields = [];
    this._customFieldService.getCustomFields().pipe(
      takeUntil(this.destroy$),
      map((fields: any) => fields.filter((field: Field) => field.destination === this.formDestination))
    ).subscribe(filteredFields => {
      filteredFields.forEach((field: any) => {
        this.form.addControl(field.id, new FormControl(''));

        this.form.patchValue({
          id: field.id,
          index: field.index,
          idName: field.idName,
          label: field.label || '',
          isActive: field.isActive,
          placeholder: field.options.placeholder,
          optionsString: field.options.choices ? field.options.choices.map((o: { label: any; }) => o.label).join(', ') : '',
          destination: field.destination || CustomFieldDestination.PROFILE,
          additionalOptions: {
            multiSelect: field.options.multiSelect || false,
            visible: field.options?.visible || true,
            required: field.options?.required || false,
            minLength: field.options?.minLength || 0,
            maxLength: field.options?.maxLength || 50
          }
        });

        const formFieldId = this.form.get('id')?.value

        if (this.formFields.find(f => f.id === formFieldId)) {
          return;
        }

        this.formFields.push({
          id: field.id,
          index: field.index,
          idName: field.idName,
          type: field.type,
          label: field.label,
          isActive: field.isActive,
          options: field.options?.choices,
          required: field.options?.required,
          placeholder: field.options?.placeholder,
          destination: field.destination,
          additionalOptions: {
            multiSelect: field.options?.multiSelect || false,
            visible: field.options?.visible || true,
            required: field.options?.required || false,
            minLength: field.options?.minLength || 0,
            maxLength: field.options?.maxLength || 50
          }
        });
      });
      this._cdr.markForCheck();
    });
  }

  updateFieldOptions(field: Field, index: number) {
    this.selectField(field, index);
    if(!field.isActive) return;

    this.updateIndexFields();

    this._cdr.markForCheck();
  }

  onDragStart(event: CdkDragStart) {
    this._renderer.addClass(document.body, 'dragging-global');
  }

  onDragEnd(event: CdkDragEnd) {
    this._renderer.removeClass(document.body, 'dragging-global');
  }

  validateId() {
    this.idError = this.formFields.some(field => field.id === this.selectedField?.id && field !== this.selectedField);
  }

  updateOptions(): void {
    const optionsString = this.form.get('optionsString')?.value;
    if (optionsString && this.selectedField) {
      this.selectedField.options = optionsString.split(',').map((opt: string) => ({ label: opt.trim(), value: opt.trim() }));
      const optionsControl = this.form.get('optionsString');
      if (optionsControl && this.selectedField.options) {
        optionsControl.setValue(this.selectedField.options.map(opt => opt.label).join(', '));
      }
    }
  }

  updateField(field: Field, property: keyof Field, event: Event | MatSelectChange) {

    if (!field.additionalOptions) {
      field.additionalOptions = {
        multiSelect: false,
        visible: true,
        required: false,
        minLength: 0,
        maxLength: 50
      };
    }

    let value: any;

    if (event instanceof MatSelectChange) {
      value = event.value;
    } else {
      const input = event.target as HTMLInputElement;
      value = input.value;
    }

    const index = this.formFields.findIndex(f => f.id === field.id);

    if (index !== -1) {
      const updatedField = { ...field };

      if (property === 'visible' || property === 'required' || property === 'multiSelect') {
        updatedField.additionalOptions = {
          ...updatedField.additionalOptions,
          [property]: value
        };
      } else if (property === 'minLength' || property === 'maxLength') {
        updatedField.additionalOptions = {
          ...updatedField.additionalOptions,
          [property]: Number(value)
        };
      } else {
        updatedField[property] = value;
      }

      this.formFields[index] = updatedField;
      this.selectedField = updatedField;

      this._cdr.markForCheck();
    }
  }

  drop(event: CdkDragDrop<Field[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const copiedItem: Field = {
        ...event.previousContainer.data[event.previousIndex],
        id: this.generateId(),
        isActive: false,
        additionalOptions: event.previousContainer.data[event.previousIndex].additionalOptions || {
          multiSelect: false,
          visible: true,
          required: false,
          minLength: 0,
          maxLength: 50
        }
      };
      this.form.addControl(copiedItem.id, new FormControl(''));
      event.container.data.splice(event.currentIndex, 0, copiedItem);
      this._cdr.markForCheck();
    }
    this.saveForm();
  }

  generateId(): string {
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    return `_${uuid}`;
  }

  isIdValidLocalId(id: string): boolean {
    return id.startsWith('_');
  }

  deleteField(field: Field, index: number) {
    this._customFieldService.deleteCustomField(field.id).pipe(takeUntil(this.destroy$)).subscribe();
    this.form.removeControl(field.id);
    this.formFields.splice(index, 1);
    this.selectedField = null;
    this.selectedFieldIndex = null;
  }

  selectField(field: Field, index: number) {

    if (!field.additionalOptions) {
      field.additionalOptions = {
        multiSelect: false,
        visible: true,
        required: false,
        minLength: 0,
        maxLength: 50
      };
    }

    if (this.selectedField && this.selectedFieldIndex === index) {
      this.selectedField = null;
      this.selectedFieldIndex = -1;

      this.form.reset();
    } else {
      this.selectedField = field;
      this.selectedFieldIndex = index;

      this.form.patchValue({
        id: field.id,
        idName: field.idName,
        label: field.label || '',
        placeholder: field.placeholder,
        optionsString: field.options && Array.isArray(field.options) ? field.options.map((o: { label: any; }) => o.label).join(', ') : '',
        destination: field.destination || CustomFieldDestination.PROFILE,
        additionalOptions: {
          multiSelect: field.additionalOptions?.multiSelect || false,
          visible: field.additionalOptions?.visible || true,
          required: field.additionalOptions?.required || false,
          minLength: field.additionalOptions?.minLength || 0,
          maxLength: field.additionalOptions?.maxLength || 50
        }
      });
    }

    this._cdr.markForCheck();
  }

  onInputChange(event: Event) {
    const inputElement = event.target as HTMLInputElement | null;
    if (inputElement) {
      const value = inputElement.value;
    }
  }

  updateFormDestination(event: MatSelectChange) {
    this.formDestination = event.value;
    this.getFields();
  }

  saveForm() {
    if (!this.hasValidField()) {
      return;
    }

    this.formFields.forEach(field => {
      field.destination = this.formDestination;
    });

    const formData = this.formFields.map((field, index) => {
      return {
        index: index,
        idName: field.idName,
        type: field.type,
        label: field.label,
        isActive: field.isActive,
        placeholder: field.placeholder,
        options: field.options || [],
        destination: field.destination,
        additionalOptions: {
          multiSelect: field.additionalOptions?.multiSelect || false,
          required: field.additionalOptions?.required || false,
          visible: field.additionalOptions?.visible || true,
          minLength: field.additionalOptions?.minLength || 0,
          maxLength: field.additionalOptions?.maxLength || 50
        }
      };
    });

    const dataFields = formData.map((field, index) => {
      return {
        index: index,
        idName: field.idName,
        type: field.type,
        label: field.label || '',
        isActive: field.isActive,
        options: {
          multiSelect: field.additionalOptions.multiSelect,
          required: field.additionalOptions.required,
          placeholder: field.placeholder,
          minLength: field.additionalOptions.minLength,
          maxLength: field.additionalOptions.maxLength,
          visible: field.additionalOptions.visible,
          choices: field.options || [],
        },
        destination: field.destination,
      };
    });

    dataFields.forEach(async field => {
      if(field.isActive) {
        this.updateIndexFields();
        return
      }
      field.isActive = true;
       await this._customFieldService.createCustomField(field).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.getFields();
          this._cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error al guardar formulario:', error);
        }
      });
    });
    // setTimeout(() => {
    //   this.getFields();
    // }, 400);
  }

  updateIndexFields() {
    this.formFields.forEach((field, index) => {
      field.index = index;

      if(this.isIdValidLocalId(field.id)) return;

      const updateField: CustomField = {
        index: index,
        idName: this.formFields[index].idName,
        type: this.formFields[index].type,
        label: this.formFields[index].label || '',
        options: {
          multiSelect: this.formFields[index].additionalOptions?.multiSelect,
          required: this.formFields[index].additionalOptions?.required,
          placeholder: this.formFields[index]?.placeholder,
          minLength: this.formFields[index].additionalOptions?.minLength || 0,
          maxLength: this.formFields[index].additionalOptions?.maxLength || 50,
          visible: this.formFields[index].additionalOptions?.visible || true,
          choices: this.formFields[index]?.options || [],
        },
        destination: this.formFields[index].destination,
      };

      this._customFieldService.updateCustomField(field.id, updateField).pipe(takeUntil(this.destroy$)).subscribe();
    });
  }

  hasValidField(): boolean {
    return this.formFields.length > 0 && this.formFields.some(field => {
      return field.label && field.id;
    });
  }
}
