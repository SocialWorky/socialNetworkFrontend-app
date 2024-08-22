import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'workyDateFormat'
})
export class WorkyDateFormatPipe implements PipeTransform {
  transform(value: string | Date): string {
    if (!value) return '';

    const date = new Date(value);
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
      hour = '00';
    }

    return `${day}/${month}/${year}, ${hour}:${minute} ${period}`;
  }
}
