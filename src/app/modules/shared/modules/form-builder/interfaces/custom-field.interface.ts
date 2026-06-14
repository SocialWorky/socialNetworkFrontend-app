export enum CustomFieldType {
  TEXT = 'text',
  LIST = 'list',
  TEXTAREA = 'textarea',
  OPTION = 'option',
  DATE = 'date',
  IMAGE = 'image',
  SELECT = 'select',
  LOCATION = 'location',
  NUMBER = 'number',
  EMAIL = 'email',
  PHONE = 'phone',
  URL = 'url',
  BOOLEAN = 'boolean',
  RADIO = 'radio',
}

export enum CustomFieldDestination {
  PROFILE = 'profile',
  REGISTRATION = 'register',
}

export interface Choice {
  value: string;
  label: string;
}

export interface ConditionalRule {
  dependsOn: string;
  values: string[];
}

export interface CascadeRule {
  dependsOn: string;
  optionsByParent?: Record<string, Choice[]>;
}

export interface FieldOptions {
  multiSelect?: boolean;
  required?: boolean;
  placeholder?: string;
  defaultValue?: any;
  visible?: boolean;
  showInProfileDetail?: boolean;
  minLength?: number;
  maxLength?: number;
  conditional?: ConditionalRule;
  cascade?: CascadeRule;
}

export interface TextOptions extends FieldOptions {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  email?: boolean;
  mask?: string;
}

export interface SelectOptions extends FieldOptions {
  choices?: { value: string; label: string }[];
  multiple?: boolean;
}

export interface NumberOptions extends FieldOptions {
  min?: number;
  max?: number;
  step?: number;
}

export interface TextAreaOptions extends FieldOptions {
  rows?: number;
  cols?: number;
}

export interface CustomField {
  index: number;
  idName: string;
  type: CustomFieldType;
  label: string;
  options?: FieldOptions | TextOptions | SelectOptions | NumberOptions | TextAreaOptions;
  destination: CustomFieldDestination;
}
