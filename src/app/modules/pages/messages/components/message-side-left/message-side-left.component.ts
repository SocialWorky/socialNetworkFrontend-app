import { Component, OnInit, ChangeDetectorRef  } from '@angular/core';
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

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.currentUserId = this.authService.getDecodedToken().id;

    this.userService.getAllUsers().subscribe(
      (data: User[]) => { 
        this.users = data.filter((user: User) => user._id !== this.currentUserId);
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error fetching users', error);
      }
    );
  }
}
