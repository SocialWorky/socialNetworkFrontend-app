import { Pipe, PipeTransform } from '@angular/core';
import { translations } from '@translations/translations';

export const getTranslationByQuantity = (key: string, quantity: number): string => {
  if (quantity === undefined) return translations[key] || '';

  if (quantity === 1) return translations[`${key}_one`] || '';
  return translations[`${key}_other`] || '';
 };

export const linkTranslationArguments = (key: string, args: any[]): string => {

  if (!translations[key]) return '';

  return translations[key].replace(/{(\d+)}/g, (match, number) => {
    return typeof args[number] !== 'undefined'
      ? args[number]
      : match
    ;
  });
};

@Pipe({
    name: 'workyTranslations',
    standalone: false
})
export class TranslationsPipe implements PipeTransform {
  transform(value: string, type?: string, ...args: any[]): string {
    switch (type) {
    case 'quantity':
      const quantity: number = args[0];
      return getTranslationByQuantity(value, quantity);

    case 'arguments':
      return linkTranslationArguments(value, args);

    default:
      return translations[value] || '';
    }
  }
}
