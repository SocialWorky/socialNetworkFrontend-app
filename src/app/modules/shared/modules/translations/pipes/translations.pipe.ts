import { Pipe, PipeTransform } from '@angular/core';
import { translations, getDynamicTranslation } from '@translations/translations';

@Pipe({
  name: 'workyTranslations',
  standalone: false,
})
export class TranslationsPipe implements PipeTransform {
  transform(value: string, type?: string, ...args: any[]): string {
    switch (type) {
      case 'quantity':
        const quantity: number = args[0];
        return this.getTranslationByQuantity(value, quantity);

      case 'arguments':
        return this.linkTranslationArguments(value, args);

      default:
        if (translations[value]) {
          return translations[value];
        }

        return getDynamicTranslation(value);
    }
  }

  private getTranslationByQuantity(key: string, quantity: number): string {
    if (quantity === undefined) return translations[key] || '';

    if (quantity === 1) return translations[`${key}_one`] || '';
    return translations[`${key}_other`] || '';
  }

  private linkTranslationArguments(key: string, args: any[]): string {
    if (!translations[key]) return '';

    return translations[key].replace(/{(\d+)}/g, (match, number) => {
      return typeof args[number] !== 'undefined' ? args[number] : match;
    });
  }
}
