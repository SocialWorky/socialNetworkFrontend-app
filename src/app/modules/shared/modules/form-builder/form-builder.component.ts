import { Component, ChangeDetectorRef } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { FormGroup, FormControl } from '@angular/forms';
import { Field } from './interfaces/field.interface';
import { CustomFieldType, CustomFieldDestination } from './interfaces/custom-field.interface';
import { MatSelectChange } from '@angular/material/select';

@Component({
  selector: 'worky-form-builder',
  templateUrl: './form-builder.component.html',
  styleUrls: ['./form-builder.component.scss']
})
export class FormBuilderComponent {
  form: FormGroup = new FormGroup({});
  selectedField: Field | null = null;
  idError = false;
  selectedFieldIndex: number | null = null;
  formDestination: CustomFieldDestination = CustomFieldDestination.PROFILE;

  enumCustomFieldType = CustomFieldType;

  availableFields: Field[] = [
    { type: CustomFieldType.TEXT, id: this.generateId(), label: 'Campo de Texto', destination: CustomFieldDestination.PROFILE },
    { type: CustomFieldType.TEXTAREA, id: this.generateId(), label: 'Área de Texto', destination: CustomFieldDestination.PROFILE},
    { type: CustomFieldType.SELECT, id: this.generateId(), label: 'Select', options: [], destination: CustomFieldDestination.PROFILE },
    // Agregar más tipos según sea necesario
  ];

  formFields: Field[] = [];

  customFieldDestinations = Object.values(CustomFieldDestination);

  constructor(private cdRef: ChangeDetectorRef) {}

  ngOnInit() {
    this.formDestination = this.customFieldDestinations[0];
    this.form = new FormGroup({
      id: new FormControl(''),
      label: new FormControl(''),
      placeholder: new FormControl(''),
      optionsString: new FormControl(''), // Para almacenar opciones separadas por comas
      destination: new FormControl(CustomFieldDestination.PROFILE), // Valor por defecto
      additionalOptions: new FormControl({}) // Para opciones adicionales
    });
  }

  validateId() {
    this.idError = this.formFields.some(field => field.id === this.selectedField?.id && field !== this.selectedField);
  }

  updateOptions() {
    if (this.selectedField && this.selectedField.type === CustomFieldType.OPTION) {
      const optionsArray = this.form.get('optionsString')?.value.split(',').map((option: string) => option.trim()) || [];
      this.selectedField.options = optionsArray.map((option: any) => ({
        label: option,
        value: option
      }));
    }
  }

  updateField(field: Field, property: keyof Field, event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    const updatedField = { ...field, [property]: value };
    const index = this.formFields.findIndex(f => f.id === field.id);

    if (index !== -1) {
      this.formFields = [...this.formFields.slice(0, index), updatedField, ...this.formFields.slice(index + 1)];
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
    }
    this.cdRef.detectChanges();
  }

  generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  deleteField() {
    if (this.selectedField && this.selectedFieldIndex !== null) {
      this.form.removeControl(this.selectedField.id);
      this.formFields.splice(this.selectedFieldIndex, 1);
      this.selectedField = null;
      this.selectedFieldIndex = null;
    }
  }

  selectField(field: Field, index: number) {
    this.selectedField = field;
    this.selectedFieldIndex = index;

    this.form.patchValue({
      id: field.id,
      label: field.label,
      placeholder: field.placeholder,
      optionsString: field.options ? field.options.map((o: { label: any; }) => o.label).join(', ') : '',
      destination: field.destination || CustomFieldDestination.PROFILE,
      additionalOptions: field.additionalOptions || {}
    });
  }

  onInputChange(event: Event) {
    const inputElement = event.target as HTMLInputElement | null;
    if (inputElement) {
      const value = inputElement.value;
      // Realiza alguna acción con `value`
    }
  }

  updateFormDestination(event: MatSelectChange) {
    this.formDestination = event.value;
  }

  saveForm() {

    this.formFields.forEach(field => {
      field.destination = this.formDestination; // Asignar el destino del formulario a cada campo
    });

    const formData = this.formFields.map(field => {
      return {
        id: field.id,
        type: field.type,
        label: field.label,
        placeholder: field.placeholder,
        options: field.options || [], // Incluye opciones para selects
        required: field.required,
        destination: field.destination,
        additionalOptions: field.additionalOptions // Incluye opciones adicionales
      };
    });

    console.log('Formulario guardado:', formData);
  }

  hasValidField(): boolean {
    return this.formFields.length > 0 && this.formFields.some(field => {
      return field.label && field.id; // Ajusta según tus criterios de validación
    });
  }
}
