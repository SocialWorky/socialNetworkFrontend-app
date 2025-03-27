import { Pipe, PipeTransform } from '@angular/core';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { translations } from 'src/translations/translations';

@Pipe({
  name: 'workyDate',
  standalone: false,
})
export class WorkyDatePipe implements PipeTransform {
  transform(value: string | Date, mode: 'relative' | 'absolute' = 'relative'): string {
    if (!value) return '';

    const date = typeof value === 'string' ? parseISO(value) : value;

    if (mode === 'relative') {
      return this.formatRelativeDate(date);
    } else {
      return this.formatAbsoluteDate(date);
    }
  }

  private formatRelativeDate(date: Date): string {
    const distance = formatDistanceToNow(date, { addSuffix: true });
    const key = this.mapDistanceToKey(distance);
    const count = this.extractCount(distance);
    return this.replaceTranslationVariables(translations[key], { count });
  }

  private formatAbsoluteDate(date: Date): string {
    const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    const day = localDate.getDate().toString().padStart(2, '0');
    const month = (localDate.getMonth() + 1).toString().padStart(2, '0');
    const year = localDate.getFullYear().toString();
    let hour = localDate.getHours().toString().padStart(2, '0');
    const minute = localDate.getMinutes().toString().padStart(2, '0');
    const period = hour >= '12' ? 'PM' : 'AM';

    if (hour > '12') {
      hour = (parseInt(hour) - 12).toString().padStart(2, '0');
    } else if (hour === '00') {
      hour = '12';
    }

    return `${day}/${month}/${year}, ${hour}:${minute} ${period}`;
  }

  private mapDistanceToKey(distance: string): string {
    const mapping = {
      'less than a minute': 'DATE_FNS.LESS_THAN_A_MINUTE',
      'minute': 'DATE_FNS.X_MINUTES',
      'hour': 'DATE_FNS.X_HOURS',
      'day': 'DATE_FNS.X_DAYS',
      'month': 'DATE_FNS.X_MONTHS',
      'year': 'DATE_FNS.X_YEARS',
    };

    for (const [key, value] of Object.entries(mapping)) {
      if (distance.includes(key)) {
        return value;
      }
    }

    return 'DATE_FNS.UNKNOWN';
  }

  private extractCount(distance: string): number {
    const match = distance.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  private replaceTranslationVariables(template: string, variables: { [key: string]: any }): string {
    return template.replace(/{{\s*(.*?)\s*}}/g, (_, expression) => {
      try {
        return new Function('variables', `with(variables) { return ${expression}; }`)(variables);
      } catch {
        return '';
      }
    });
  }
}
