import { Pipe, PipeTransform } from '@angular/core';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { translations } from 'src/translations/translations';

@Pipe({
  name: 'workyRelativeTime'
})
export class WorkyRelativeTimePipe implements PipeTransform {

  constructor() {}

  transform(value: string | Date): string {
    if (!value) {
      return '';
    }

    const date = typeof value === 'string' ? parseISO(value) : value;
    const distance = formatDistanceToNow(date, { addSuffix: true });
    const key = this.mapDistanceToKey(distance);
    const count = this.extractCount(distance);
    return this.replaceTranslationVariables(translations[key], { count });
  }

  private mapDistanceToKey(distance: string): string {
    if (distance.includes('less than a minute')) {
      return 'DATE_FNS.LESS_THAN_A_MINUTE';
    } else if (distance.includes('minute')) {
      return 'DATE_FNS.X_MINUTES';
    } else if (distance.includes('hour')) {
      return 'DATE_FNS.X_HOURS';
    } else if (distance.includes('day')) {
      return 'DATE_FNS.X_DAYS';
    } else if (distance.includes('month')) {
      return 'DATE_FNS.X_MONTHS';
    } else if (distance.includes('year')) {
      return 'DATE_FNS.X_YEARS';
    } else {
      return 'DATE_FNS.UNKNOWN';
    }
  }

  private extractCount(distance: string): number {
    const match = distance.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  private replaceTranslationVariables(template: string, variables: { [key: string]: any }): string {
    return template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => variables[key] || '');
  }
}
