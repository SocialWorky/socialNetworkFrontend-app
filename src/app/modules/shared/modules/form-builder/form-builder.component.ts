import { Component, ChangeDetectorRef, OnInit, Renderer2 } from '@angular/core';
import { CdkDragDrop, CdkDragEnd, CdkDragStart, moveItemInArray } from '@angular/cdk/drag-drop';
import { FormGroup, FormControl } from '@angular/forms';
import { MatSelectChange } from '@angular/material/select';

import { Field } from './interfaces/field.interface';
import { CustomFieldType, CustomFieldDestination } from './interfaces/custom-field.interface';

@Component({
  selector: 'worky-form-builder',
  templateUrl: './form-builder.component.html',
  styleUrls: ['./form-builder.component.scss']
})
export class FormBuilderComponent implements OnInit {
  form: FormGroup = new FormGroup({});
  selectedField: Field | null = null;
  idError = false;
  selectedFieldIndex: number | null = null;
  formDestination: CustomFieldDestination = CustomFieldDestination.PROFILE;

  enumCustomFieldType = CustomFieldType;

  availableFields: Field[] = [
    { type: CustomFieldType.TEXT, id: this.generateId(), label: 'Campo de Texto', destination: CustomFieldDestination.PROFILE },
    { type: CustomFieldType.TEXTAREA, id: this.generateId(), label: 'Área de Texto', destination: CustomFieldDestination.PROFILE },
    { type: CustomFieldType.SELECT, id: this.generateId(), label: 'Select', options: [], destination: CustomFieldDestination.PROFILE },
  ];

  formFields: Field[] = [];

  customFieldDestinations = Object.values(CustomFieldDestination);

  constructor(
    private cdRef: ChangeDetectorRef,
    private renderer: Renderer2
  ) {}

  ngOnInit() {
    this.formDestination = this.customFieldDestinations[0];
    this.form = new FormGroup({
      id: new FormControl(''),
      label: new FormControl(''),
      placeholder: new FormControl(''),
      optionsString: new FormControl(''),
      destination: new FormControl(CustomFieldDestination.PROFILE),
      additionalOptions: new FormGroup({
        visible: new FormControl(true),
        required: new FormControl(false),
        minLength: new FormControl(''),
        maxLength: new FormControl('')
      })
    });
  }

  onDragStart(event: CdkDragStart) {
    this.renderer.addClass(document.body, 'dragging-global');
  }

  onDragEnd(event: CdkDragEnd) {
    this.renderer.removeClass(document.body, 'dragging-global');
  }

  validateId() {
    this.idError = this.formFields.some(field => field.id === this.selectedField?.id && field !== this.selectedField);
  }

  updateOptions() {
    if (this.selectedField && this.selectedField.type === CustomFieldType.SELECT) {
      const optionsArray = this.form.get('optionsString')?.value.split(',').map((option: string) => option.trim()) || [];
      this.selectedField.options = optionsArray.map((option: any) => ({
        label: option,
        value: option
      }));
    }
  }

  updateField(field: Field, property: keyof Field, event: Event | MatSelectChange) {
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

        if (property === 'visible' || property === 'required' || property === 'minLength' || property === 'maxLength') {
          updatedField.additionalOptions = {
            ...updatedField.additionalOptions,
            [property]: value
          };
        } else {
          updatedField[property] = value;
        }

        this.formFields[index] = updatedField;
        this.selectedField = updatedField;

        this.cdRef.detectChanges();
      }
    }

  drop(event: CdkDragDrop<Field[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const copiedItem: Field = { ...event.previousContainer.data[event.previousIndex] };
      copiedItem.id = this.generateId();
      this.form.addControl(copiedItem.id, new FormControl(''));
      event.container.data.splice(event.currentIndex, 0, copiedItem);
      this.cdRef.detectChanges();
    }
    this.cdRef.detectChanges();
  }

  generateId(): string {
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    return `_${uuid}`;
  }


  deleteField(field: Field, index: number) {
    this.form.removeControl(field.id);
    this.formFields.splice(index, 1);
    this.selectedField = null;
    this.selectedFieldIndex = null;
  }

  selectField(field: Field, index: number) {
    if (this.selectedField && this.selectedFieldIndex === index) {
      this.selectedField = null;
      this.selectedFieldIndex = -1;

      this.form.reset();
    } else {
      this.selectedField = field;
      this.selectedFieldIndex = index;

      this.form.patchValue({
        id: field.id,
        label: field.label,
        placeholder: field.placeholder,
        optionsString: field.options ? field.options.map((o: { label: any; }) => o.label).join(', ') : '',
        destination: field.destination || CustomFieldDestination.PROFILE,
        additionalOptions: {
          visible: field.additionalOptions?.visible || true,
          required: field.additionalOptions?.required || false,
          minLength: field.additionalOptions?.minLength || '',
          maxLength: field.additionalOptions?.maxLength || ''
        }
      });
    }

    // Actualiza la vista
    this.cdRef.markForCheck();
  }

  onInputChange(event: Event) {
    const inputElement = event.target as HTMLInputElement | null;
    if (inputElement) {
      const value = inputElement.value;
    }
  }

  updateFormDestination(event: MatSelectChange) {
    this.formDestination = event.value;
  }

  saveForm() {
    this.formFields.forEach(field => {
      field.destination = this.formDestination; 
    });

    const formData = this.formFields.map(field => {
      return {
        id: field.id,
        type: field.type,
        label: field.label,
        placeholder: field.placeholder,
        options: field.options || [],
        destination: field.destination,
        additionalOptions: {
          required: field.additionalOptions?.required || false,
          visible: field.additionalOptions?.visible || true,
          minLength: field.additionalOptions?.minLength || null,
          maxLength: field.additionalOptions?.maxLength || null
        }
      };
    });

    console.log('Formulario guardado:', formData);
  }

  hasValidField(): boolean {
    return this.formFields.length > 0 && this.formFields.some(field => {
      return field.label && field.id; 
    });
  }
}
