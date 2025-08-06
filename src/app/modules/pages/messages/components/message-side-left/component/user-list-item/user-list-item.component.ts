import { Component, EventEmitter, Input, Output } from "@angular/core";
import { User } from "@shared/interfaces/user.interface";
import { GlobalEventService } from "@shared/services/globalEventService.service";

@Component({
    selector: 'worky-user-list-item',
    templateUrl: './user-list-item.component.html',
    styleUrls: ['./user-list-item.component.scss'],
    standalone: false
})
export class UserListItemComponent {

  @Input() user!: { user: User; lastMessage: string; createAt: Date; unreadMessagesCount: number };

  @Output() userSelected = new EventEmitter<string>();

  constructor(private _globalEventService: GlobalEventService) {}

  sanitizeHtml(message: string): string {
    return this._globalEventService.sanitizeHtml(message);
  }

  formatTimeOrElapsed(date: Date): string {
    const now = new Date();
    const givenDate = new Date(date);

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfGivenDate = new Date(givenDate.getFullYear(), givenDate.getMonth(), givenDate.getDate());

    const timeDifference = now.getTime() - givenDate.getTime();
    const daysDifference = Math.floor((startOfToday.getTime() - startOfGivenDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDifference === 0) {
      return new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false }).format(givenDate);
    }

    if (daysDifference < 30) {
      return `${daysDifference} día${daysDifference > 1 ? 's' : ''} atrás`;
    }

    const monthsDifference = Math.floor(daysDifference / 30);
    return `${monthsDifference} mes${monthsDifference > 1 ? 'es' : ''} atrás`;
  }
}
