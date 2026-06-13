import { ValidatorFn, Validators } from '@angular/forms';

// Lenient patterns — server-side validation is the source of truth; these only
// give immediate client feedback.
const URL_PATTERN = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i;
const PHONE_PATTERN = /^[+]?[\d\s()-]{6,20}$/;

/**
 * Builds the Angular validators for a dynamic custom field based on its type and
 * persisted options. Shared by the profile editor and the registration form so the
 * rules stay consistent.
 */
export function buildDynamicFieldValidators(type: string, options: any = {}): ValidatorFn[] {
  const validators: ValidatorFn[] = [];

  if (options?.required) {
    validators.push(type === 'boolean' ? Validators.requiredTrue : Validators.required);
  }

  switch (type) {
    case 'email':
      validators.push(Validators.email);
      break;
    case 'url':
      validators.push(Validators.pattern(URL_PATTERN));
      break;
    case 'phone':
      validators.push(Validators.pattern(PHONE_PATTERN));
      break;
    case 'number':
      // For number fields min/maxLength are reused as the numeric value bounds.
      if (options?.minLength > 0) validators.push(Validators.min(options.minLength));
      if (options?.maxLength > 0) validators.push(Validators.max(options.maxLength));
      break;
    default:
      if (options?.maxLength > 0) validators.push(Validators.maxLength(options.maxLength));
      if (options?.minLength > 0) validators.push(Validators.minLength(options.minLength));
      break;
  }

  return validators;
}
