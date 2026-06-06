import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from 'src/environments/environment';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { Message, CreateMessageDto, UpdateMessageDto, MarkAsReadDto, MessageType } from '../interfaces/message.interface';
import { Conversation, PaginatedResponse } from '../interfaces/conversation.interface';

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private _baseUrl: string;

  constructor(
    private _http: HttpClient,
    private _logService: LogService
  ) {
    this._baseUrl = environment.APIMESSAGESERVICE;
  }

  createMessage(messageData: CreateMessageDto): Observable<Message> {
    const url = `${this._baseUrl}/messages`;
    return this._http.post<Message>(url, messageData).pipe(
      catchError((error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'MessageService',
          'Error creating message',
          { error: String(error), messageData }
        );
        return throwError(() => error);
      })
    );
  }

  getConversations(page: number = 1, pageSize: number = 20): Observable<PaginatedResponse<Conversation>> {
    const url = `${this._baseUrl}/messages/conversations`;
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this._http.get<PaginatedResponse<Conversation>>(url, { params }).pipe(
      catchError((error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'MessageService',
          'Error getting conversations',
          { error: String(error), page, pageSize }
        );
        return throwError(() => error);
      })
    );
  }

  getMessagesWithUser(otherUserId: string, page: number = 1, pageSize: number = 50, sort?: 'ASC' | 'DESC'): Observable<PaginatedResponse<Message>> {
    const url = `${this._baseUrl}/messages/conversations/${otherUserId}`;
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    
    if (sort) {
      params = params.set('sort', sort);
    }

    return this._http.get<PaginatedResponse<Message>>(url, { params }).pipe(
      catchError((error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'MessageService',
          'Error getting messages with user',
          { error: String(error), otherUserId, page, pageSize, sort }
        );
        return throwError(() => error);
      })
    );
  }

  getLastMessageWithUser(otherUserId: string): Observable<Message | null> {
    const url = `${this._baseUrl}/messages/conversations/${otherUserId}/last`;
    return this._http.get<Message | null>(url).pipe(
      catchError((error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'MessageService',
          'Error getting last message',
          { error: String(error), otherUserId }
        );
        return throwError(() => error);
      })
    );
  }

  getMessageCountWithUser(otherUserId: string): Observable<number> {
    const url = `${this._baseUrl}/messages/conversations/${otherUserId}/count`;
    return this._http.get<number>(url).pipe(
      catchError((error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'MessageService',
          'Error getting message count',
          { error: String(error), otherUserId }
        );
        return throwError(() => error);
      })
    );
  }

  searchMessages(query: string, page: number = 1, pageSize: number = 20): Observable<PaginatedResponse<Message>> {
    const url = `${this._baseUrl}/messages/search`;
    const params = new HttpParams()
      .set('query', query)
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this._http.get<PaginatedResponse<Message>>(url, { params }).pipe(
      catchError((error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'MessageService',
          'Error searching messages',
          { error: String(error), query, page, pageSize }
        );
        return throwError(() => error);
      })
    );
  }

  searchMessagesByDate(startDate: string, endDate: string): Observable<Message[]> {
    const url = `${this._baseUrl}/messages/conversations/date`;
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this._http.get<Message[]>(url, { params }).pipe(
      catchError((error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'MessageService',
          'Error searching messages by date',
          { error: String(error), startDate, endDate }
        );
        return throwError(() => error);
      })
    );
  }

  updateMessage(messageId: string, updateData: UpdateMessageDto): Observable<Message> {
    const url = `${this._baseUrl}/messages/${messageId}`;
    return this._http.put<Message>(url, updateData).pipe(
      catchError((error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'MessageService',
          'Error updating message',
          { error: String(error), messageId, updateData }
        );
        return throwError(() => error);
      })
    );
  }

  deleteMessage(messageId: string): Observable<{ message: string }> {
    const url = `${this._baseUrl}/messages/${messageId}`;
    return this._http.delete<{ message: string }>(url).pipe(
      catchError((error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'MessageService',
          'Error deleting message',
          { error: String(error), messageId }
        );
        return throwError(() => error);
      })
    );
  }

  markMessageAsRead(messageId: string): Observable<Message> {
    const url = `${this._baseUrl}/messages/${messageId}/read`;
    return this._http.put<Message>(url, {}).pipe(
      catchError((error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'MessageService',
          'Error marking message as read',
          { error: String(error), messageId }
        );
        return throwError(() => error);
      })
    );
  }

  markMessagesAsRead(markData: MarkAsReadDto): Observable<Message[]> {
    const url = `${this._baseUrl}/messages/mark-as-read`;
    return this._http.post<Message[]>(url, markData).pipe(
      catchError((error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'MessageService',
          'Error marking messages as read',
          { error: String(error), markData }
        );
        return throwError(() => error);
      })
    );
  }

  getUnreadCount(chatId: string, senderId: string): Observable<number> {
    const url = `${this._baseUrl}/messages/unread-count/${chatId}/${senderId}`;
    return this._http.get<number>(url).pipe(
      catchError((error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'MessageService',
          'Error getting unread count',
          { error: String(error), chatId, senderId }
        );
        return throwError(() => error);
      })
    );
  }

  getUnreadAllMessagesCount(): Observable<number> {
    const url = `${this._baseUrl}/messages/unread-all-count`;
    return this._http.get<number>(url).pipe(
      catchError((error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'MessageService',
          'Error getting all unread messages count',
          { error: String(error) }
        );
        return throwError(() => error);
      })
    );
  }

  getUsersWithConversations(): Observable<string[]> {
    const url = `${this._baseUrl}/messages/users`;
    return this._http.get<string[]>(url).pipe(
      catchError((error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'MessageService',
          'Error getting users with conversations',
          { error: String(error) }
        );
        return throwError(() => error);
      })
    );
  }

  getMessagesStatistics(): Observable<any> {
    const url = `${this._baseUrl}/messages/statistics`;
    return this._http.get<any>(url).pipe(
      catchError((error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'MessageService',
          'Error getting messages statistics',
          { error: String(error) }
        );
        return throwError(() => error);
      })
    );
  }

  verifyAdminPermissions(): Observable<{ hasAdminAccess: boolean; message: string }> {
    const url = `${this._baseUrl}/messages/test-auth`;
    return this._http.get<{ hasAdminAccess: boolean; message: string }>(url).pipe(
      catchError((error) => {
        this._logService.log(
          LevelLogEnum.ERROR,
          'MessageService',
          'Error verifying admin permissions',
          { error: String(error) }
        );
        return throwError(() => error);
      })
    );
  }

  generateChatId(userId1: string, userId2: string): string {
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
  }
}
