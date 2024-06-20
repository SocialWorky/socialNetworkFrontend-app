import { Component, OnInit } from '@angular/core';
import { UserService } from '@shared/services/users.service';

@Component({
  selector: 'worky-message-side-left',
  templateUrl: './message-side-left.component.html',
  styleUrls: ['./message-side-left.component.scss'],
})
export class MessageSideLeftComponent  implements OnInit {

  users: any[] = [];

  constructor(private userService: UserService) { }

  ngOnInit(): void {
    this.userService.getAllUsers().subscribe(
      (data) => {
        this.users = data;
      },
      (error) => {
        console.error('Error fetching users', error);
      }
    );
  }

}
