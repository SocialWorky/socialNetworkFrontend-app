import { Injectable } from "@angular/core";
import { User } from "@shared/interfaces/user.interface";
import { BehaviorSubject } from "rxjs";

@Injectable({
  providedIn: 'root',
})
export class MessageStateService {
  private usersWithConversationsSubject = new BehaviorSubject<
    Array<{ user: User; lastMessage: string; createAt: Date; unreadMessagesCount: number }>
  >([]);

  usersWithConversations$ = this.usersWithConversationsSubject.asObservable();

  updateUsersWithConversations(users: Array<{ user: User; lastMessage: string; createAt: Date; unreadMessagesCount: number }>) {
    const sortedUsers = users.sort((a, b) => new Date(b.createAt).getTime() - new Date(a.createAt).getTime());
    this.usersWithConversationsSubject.next(sortedUsers);
  }

  addUserOrUpdate(user: User, lastMessage: string, createAt: Date, unreadMessagesCount: number) {
    const currentUsers = this.usersWithConversationsSubject.value;
    const existingUserIndex = currentUsers.findIndex(u => u.user._id === user._id);

    if (existingUserIndex !== -1) {
      currentUsers[existingUserIndex] = { user, lastMessage, createAt, unreadMessagesCount };
    } else {
      currentUsers.push({ user, lastMessage, createAt, unreadMessagesCount });
    }

    const sortedUsers = currentUsers.sort((a, b) => new Date(b.createAt).getTime() - new Date(a.createAt).getTime());
    this.usersWithConversationsSubject.next(sortedUsers);
  }
}
