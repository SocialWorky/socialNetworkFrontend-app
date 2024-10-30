import { CustomField, CustomFieldDestination, CustomFieldType } from './custom-field.interface';

export interface Field {
  id: string;
  type: CustomFieldType; // Cambiar a usar el enum del frontend
  label?: string; // Propiedad opcional para la etiqueta
  value?: any;    // Propiedad opcional para el valor
  options?: any[]; // Propiedad para opciones (select)
  required?: boolean; // Propiedad para indicar si el campo es obligatorio
  placeholder?: string; // Propiedad para el placeholder
  destination: CustomFieldDestination; // Nueva propiedad para el destino
  additionalOptions?: any; // Para almacenar opciones adicionales específicas del tipo
}
