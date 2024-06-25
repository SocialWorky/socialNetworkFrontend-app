import { Component, OnInit, ChangeDetectorRef  } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@auth/services/auth.service';
import { User } from '@shared/interfaces/user.interface';
import { UserService } from '@shared/services/users.service';
import { MessageService } from '../../services/message.service';

@Component({
  selector: 'worky-message-side-left',
  templateUrl: './message-side-left.component.html',
  styleUrls: ['./message-side-left.component.scss'],
})
export class MessageSideLeftComponent  implements OnInit {

  users: User[] = [];

  currentUserId: string = '';

  idUserMessage: string = '';

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private _cdr: ChangeDetectorRef,
    private _activatedRoute: ActivatedRoute,
    private router: Router,
    private _messageService: MessageService
  ) { }

  async ngOnInit(): Promise<void> {

    this.idUserMessage = await this._activatedRoute.snapshot.paramMap.get('messagesId') || '';
    this._cdr.markForCheck();

    this.currentUserId = this.authService.getDecodedToken().id;

    await this.getUserMessages(this.currentUserId);
  }

  navigateToUser(messagesId: string): void {
    console.log('Navigating to user with messagesId:', messagesId);
    this.router.navigate(['/messages', messagesId]); 
  }

  private async getUserMessages(userId: string) {
    await this._messageService.getUserForMessage(userId).subscribe({
      next: (response) => {
        response.forEach((user: string) => {
          this.userService.getUserById(user).subscribe({
            next: (response: User) => {
              this.users.push(response);
              this._cdr.markForCheck();
            },
            error: (e: any) => {
              console.error('Error fetching users', e);
            }
          });
          
        });
      },
      error: (e: any) => {
        console.error('Error fetching users', e);
      }
    });
      
  }
}
