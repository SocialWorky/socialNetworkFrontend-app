import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';

@Pipe({
  name: 'messageTime',
  standalone: false
})
export class MessageTimePipe implements PipeTransform {
  private datePipe = new DatePipe('es');

  transform(value: string | Date, format: 'short' | 'long' | 'relative' = 'short'): string {
    if (!value) return '';

    const date = typeof value === 'string' ? new Date(value) : value;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (format === 'relative') {
      if (diffInSeconds < 60) {
        return 'Ahora';
      } else if (diffInMinutes < 60) {
        return `Hace ${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''}`;
      } else if (diffInHours < 24) {
        return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
      } else if (diffInDays < 7) {
        return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
      } else {
        return this.datePipe.transform(date, 'dd/MM/yyyy') || '';
      }
    } else if (format === 'long') {
      const isToday = date.toDateString() === now.toDateString();
      if (isToday) {
        return this.datePipe.transform(date, 'HH:mm') || '';
      } else {
        return this.datePipe.transform(date, 'dd/MM/yyyy HH:mm') || '';
      }
    } else {
      const isToday = date.toDateString() === now.toDateString();
      if (isToday) {
        return this.datePipe.transform(date, 'HH:mm') || '';
      } else {
        return this.datePipe.transform(date, 'dd/MM/yyyy') || '';
      }
    }
  }
}





