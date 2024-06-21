import { Component, OnInit, ChangeDetectorRef  } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@auth/services/auth.service';
import { User } from '@shared/interfaces/user.interface';
import { UserService } from '@shared/services/users.service';

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
    private router: Router
  ) { }

  async ngOnInit(): Promise<void> {

    this.idUserMessage = await this._activatedRoute.snapshot.paramMap.get('messagesId') || '';
    this._cdr.markForCheck();

    this.currentUserId = this.authService.getDecodedToken().id;

    this.userService.getAllUsers().subscribe(
      (data: User[]) => { 
        this.users = data.filter((user: User) => user._id !== this.currentUserId);
        this._cdr.detectChanges();
      },
      (error) => {
        console.error('Error fetching users', error);
      }
    );
  }

  navigateToUser(messagesId: string): void {
    console.log('Navigating to user with messagesId:', messagesId);
    this.router.navigate(['/messages', messagesId]); 
  }
}
