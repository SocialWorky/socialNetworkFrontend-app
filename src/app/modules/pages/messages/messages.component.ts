import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '@auth/services/auth.service';
import { Token } from '@shared/interfaces/token.interface';
import { DeviceDetectionService } from '@shared/services/DeviceDetection.service';
import { UserService } from '@shared/services/users.service';

@Component({
  selector: 'worky-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.scss'],
})
export class MessagesComponent implements OnInit {

  userName: string = '';

  decodedToken!: Token;

  isAuthenticated: boolean = false;

  isActive: boolean = true;

  userIsValid: boolean = false;

  userIdConsulting: string = '';

  userIdMessage: string = '';

  get isMobile(): boolean {
    return this._deviceDetectionService.isMobile();
  }

  constructor(
    private _authService: AuthService,
    private _cdr: ChangeDetectorRef,
    private _activatedRoute: ActivatedRoute,
    private _deviceDetectionService: DeviceDetectionService,
    private _userService: UserService
   ) { 
    this.isAuthenticated = this._authService.isAuthenticated();
    if (this.isAuthenticated) {
      this.decodedToken = this._authService.getDecodedToken()!;
      this.userName = this.decodedToken.name;
    }
  }

 async ngOnInit() {
    this.userIdMessage = await this._activatedRoute.snapshot.paramMap.get('userIdMessages') || '';

    if(!this.userIdMessage) return;

    this._userService.getUserById(this.userIdMessage).subscribe({
      next: (user) => {
        if (user) {
          this.userIsValid = true;
          this._cdr.markForCheck();
        }
      }
    });
 }

  onUserIdSelected(userId: string) {
    this.userIdConsulting = userId;
    this._cdr.markForCheck();
  }
}
