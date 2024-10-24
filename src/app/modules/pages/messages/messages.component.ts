import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { AuthService } from '@auth/services/auth.service';
import { Token } from '@shared/interfaces/token.interface';
import { ConfigService } from '@shared/services/config.service';
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

  private destroy$ = new Subject<void>();

  constructor(
    private _authService: AuthService,
    private _cdr: ChangeDetectorRef,
    private _activatedRoute: ActivatedRoute,
    private _deviceDetectionService: DeviceDetectionService,
    private _userService: UserService,
    private _titleService: Title,
    private _configService: ConfigService
   ) { 
    this._configService.getConfig().pipe(takeUntil(this.destroy$)).subscribe((configData) => {
      this._titleService.setTitle(configData.settings.title + ' - Messages');
    });
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onUserIdSelected(userId: string) {
    this.userIdConsulting = userId;
    this._cdr.markForCheck();
  }
}
