import { CustomField, CustomFieldDestination, CustomFieldType } from './custom-field.interface';

export interface Field {
  id: string;
  type: CustomFieldType;
  label?: string;
  value?: any;
  options?: any[];
  required?: boolean;
  placeholder?: string;
  destination: CustomFieldDestination;
  additionalOptions?: any;
  inputFormat?: string;
  minLength?: number;
  maxLength?: number;
  visible?: boolean;
}
