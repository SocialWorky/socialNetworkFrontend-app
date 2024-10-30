import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
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
      additionalOptions: new FormGroup({
        visible: new FormControl(true), // Estado por defecto
        required: new FormControl(false), // Estado por defecto
        minLength: new FormControl(''), // Valor por defecto
        maxLength: new FormControl('') // Valor por defecto
      }) // Para opciones adicionales
    });
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

      // Verifica si el evento es de tipo MatSelectChange
      if (event instanceof MatSelectChange) {
        value = event.value; // Obtiene el valor directamente de MatSelectChange
      } else {
        const input = event.target as HTMLInputElement;
        value = input.value; // Obtiene el valor de un HTMLInputElement
      }

      // Encuentra el índice del campo que se desea actualizar
      const index = this.formFields.findIndex(f => f.id === field.id);

      if (index !== -1) {
        const updatedField = { ...field };

        // Actualiza la propiedad correspondiente en el campo
        if (property === 'visible' || property === 'required' || property === 'minLength' || property === 'maxLength') {
          // Actualiza el campo en las opciones adicionales
          updatedField.additionalOptions = {
            ...updatedField.additionalOptions,
            [property]: value
          };
        } else {
          // Para propiedades generales
          updatedField[property] = value;
        }

        // Actualiza el campo en el array
        this.formFields[index] = updatedField; // Reemplaza directamente el campo actualizado
        this.selectedField = updatedField; // Actualiza el campo seleccionado

        this.cdRef.detectChanges(); // Notifica el cambio a Angular para la detección de cambios
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

  deleteField(field: Field, index: number) {
    this.form.removeControl(field.id);
    this.formFields.splice(index, 1);
    this.selectedField = null;
    this.selectedFieldIndex = null;
  }

  selectField(field: Field, index: number) {
    // Verifica si el campo seleccionado es el mismo que el que se está intentando seleccionar
    if (this.selectedField && this.selectedFieldIndex === index) {
      // Si ya está seleccionado, cerrarlo (puedes restablecer selectedField y selectedFieldIndex)
      this.selectedField = null; // O el valor por defecto
      this.selectedFieldIndex = -1; // O el valor por defecto

      // También puedes resetear el formulario si es necesario
      this.form.reset();
    } else {
      // Si no está seleccionado, abre la configuración
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
      // Realiza alguna acción con `value`
    }
  }

  updateFormDestination(event: MatSelectChange) {
    this.formDestination = event.value;
  }

  saveForm() {
    // Asignar el destino del formulario a cada campo
    this.formFields.forEach(field => {
      field.destination = this.formDestination; 
    });

    // Mapear los campos del formulario a un formato adecuado para guardar
    const formData = this.formFields.map(field => {
      return {
        id: field.id,
        type: field.type,
        label: field.label,
        placeholder: field.placeholder,
        options: field.options || [], // Incluye opciones para selects
        destination: field.destination,
        additionalOptions: {
          required: field.additionalOptions?.required || false, // Obtener el valor requerido
          visible: field.additionalOptions?.visible || true, // Obtener el estado visible
          minLength: field.additionalOptions?.minLength || null, // Obtener longitud mínima
          maxLength: field.additionalOptions?.maxLength || null // Obtener longitud máxima
        }
      };
    });

    // Imprimir los datos del formulario en la consola
    console.log('Formulario guardado:', formData);
  }

  hasValidField(): boolean {
    return this.formFields.length > 0 && this.formFields.some(field => {
      return field.label && field.id; // Ajusta según tus criterios de validación
    });
  }
}
