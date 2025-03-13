import { Component, EventEmitter, OnInit, Output } from "@angular/core";
import { Location } from '@angular/common';
import { User } from "@shared/interfaces/user.interface";
import { Observable } from "rxjs";
import { MessageStateService } from "../../../../services/message-state.service";
import { DeviceDetectionService } from "@shared/services/DeviceDetection.service";
import { Router } from "@angular/router";

@Component({
  selector: 'worky-message-list',
  templateUrl: './message-list.component.html',
  styleUrls: ['./message-list.component.scss'],
})
export class MessageListComponent implements OnInit {

  get isMobile(): boolean {
    return this._deviceDetectionService.isMobile();
  }

  @Output() userIdSelected = new EventEmitter<string>();

  users$!: Observable<Array<{ user: User; lastMessage: string; createAt: Date; unreadMessagesCount: number }>>;

  constructor(
    private _messageStateService: MessageStateService,
    private _deviceDetectionService: DeviceDetectionService,
    private _router: Router,
    private _location: Location,
  ) {}

  ngOnInit(): void {
    this.users$ = this._messageStateService.usersWithConversations$;
  }

  selectUser(userId: string): void {
    if (this.isMobile) {
      this._router.navigate(['/messages/', userId]);
    } else {
      const urlWithoutUserId = this._router.url.split('/').slice(0, 2).join('/');
      this._location.replaceState(urlWithoutUserId);
    }
    this.userIdSelected.emit(userId);
  }
}
