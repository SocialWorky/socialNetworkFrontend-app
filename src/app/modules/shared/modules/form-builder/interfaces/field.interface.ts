import { CustomFieldDestination, CustomFieldType } from './custom-field.interface';

export interface Field {
  id: string;
  index?: number;
  idName: string;
  type: CustomFieldType;
  label?: string;
  isActive?: boolean;
  value?: any;
  options?: any[];
  multiSelect?: boolean;
  required?: boolean;
  optionsString?: any[];
  placeholder?: string;
  destination: CustomFieldDestination;
  additionalOptions?: any;
  inputFormat?: string;
  minLength?: number;
  maxLength?: number;
  visible?: boolean;
}

export interface CustomField {
  id: string;
  index: number;
  idName: string;
  type: CustomFieldType;
  label: string;
  isActive: boolean;
  options: {
    choices?: Array<{ label: string; value: string }>;
    required: boolean;
    maxLength: number;
    minLength: number;
    multiSelect: boolean;
    visible: boolean;
  };
  destination: string;
}
