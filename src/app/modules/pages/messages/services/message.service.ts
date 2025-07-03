import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, switchMap, tap, catchError, map } from 'rxjs';
import { environment } from '@env/environment';
import { CreateMessage, Message, UpdateMessage } from '../interfaces/message.interface';
import { MessageDatabaseService } from '@shared/services/database/message-database.service';

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  private baseUrl: string;

  constructor(
    private http: HttpClient,
    private _messageDatabase: MessageDatabaseService
  ) {
    this.baseUrl = environment.APIMESSAGESERVICE;
    this._messageDatabase.initDatabase();
  }

  /**
   * Obtener usuarios con los que el usuario logeado tiene conversaciones.
   * @returns Observable con la lista de IDs de usuarios.
   */
  getUsersWithConversations(): Observable<string[]> {
    const url = `${this.baseUrl}/messages/users`;
    return this.http.get<string[]>(url);
  }

  /**
   * Obtener las conversaciones del usuario logeado con otro usuario específico.
   * @param currentUserId ID del usuario logeado.
   * @param otherUserId ID del otro usuario.
   * @returns Observable con la lista de mensajes.
   */
  getConversationsWithUser(currentUserId: string, otherUserId: string): Observable<Message[]> {
    const chatId = this.generateChatId(currentUserId, otherUserId);
    
    return from(this._messageDatabase.getMessagesByChatId(chatId)).pipe(
      switchMap((localMessages) => {
        console.log('Cargando mensajes desde cache local:', localMessages.length, 'mensajes');
        
        if (localMessages.length > 0) {
          this.syncMessagesInBackground(chatId);
          return of(localMessages);
        } else {
          console.log('No hay mensajes locales, cargando desde servidor');
          return this.getConversationsFromServer(currentUserId, otherUserId);
        }
      }),
      catchError((error) => {
        console.error('Error cargando desde cache, intentando servidor:', error);
        return this.getConversationsFromServer(currentUserId, otherUserId);
      })
    );
  }

  /**
   * Obtener las conversaciones con paginación inteligente
   */
  getConversationsWithUserSmart(currentUserId: string, otherUserId: string, page: number = 1, size: number = 20): Observable<{
    messages: Message[],
    total: number
  }> {
    const chatId = this.generateChatId(currentUserId, otherUserId);
    
    return from(this._messageDatabase.getMessagesByChatIdPaginated(chatId, page, size)).pipe(
      switchMap((localData) => {
        console.log('Cargando mensajes paginados desde cache:', localData.messages.length, 'de', localData.total);
        
        if (localData.messages.length > 0) {
          if (page === 1) {
            this.syncMessagesSilently(chatId);
          }
          return of(localData);
        } else {
          return this.getConversationsFromServerPaginated(currentUserId, otherUserId, page, size);
        }
      }),
      catchError((error) => {
        console.error('Error cargando mensajes paginados desde cache:', error);
        return this.getConversationsFromServerPaginated(currentUserId, otherUserId, page, size);
      })
    );
  }

  /**
   * Obtener la última conversación del usuario logeado con otro usuario específico.
   * @param otherUserId ID del otro usuario.
   * @returns Observable con el último mensaje.
   */
  getLastConversationWithUser(otherUserId: string): Observable<Message> {
    const url = `${this.baseUrl}/messages/conversations/${otherUserId}/last`;
    return this.http.get<Message>(url).pipe(
      tap((message) => {
        this._messageDatabase.addMessage(message);
      })
    );
  }

  /**
   * Contar el número de conversaciones del usuario logeado con otro usuario específico.
   * @param otherUserId ID del otro usuario.
   * @returns Observable con el número de conversaciones.
   */
  countConversationsWithUser(otherUserId: string): Observable<number> {
    const url = `${this.baseUrl}/messages/conversations/${otherUserId}/count`;
    return this.http.get<number>(url);
  }

  /**
   * Obtener las conversaciones del usuario logeado entre dos fechas específicas.
   * @param startDate Fecha de inicio en formato dd/mm/aaaa.
   * @param endDate Fecha de fin en formato dd/mm/aaaa.
   * @returns Observable con la lista de mensajes.
   */
  getConversationsByDate(startDate: string, endDate: string): Observable<Message[]> {
    const url = `${this.baseUrl}/messages/conversations/date?startDate=${startDate}&endDate=${endDate}`;
    return this.http.get<Message[]>(url).pipe(
      tap((messages) => {
        this._messageDatabase.addMessages(messages);
      })
    );
  }

  /**
   * Crear un nuevo mensaje.
   * @param createMessage Datos del mensaje a crear.
   * @returns Observable con el mensaje creado.
   */
  createMessage(createMessage: CreateMessage): Observable<Message> {
    const url = `${this.baseUrl}/messages`;
    return this.http.post<Message>(url, createMessage).pipe(
      tap((message) => {
        this._messageDatabase.addMessage(message);
      })
    );
  }

  /**
   * Actualizar el estado de lectura de un mensaje.
   * @param messageId ID del mensaje a actualizar.
   * @returns Observable con el mensaje actualizado.
   */
  updateMessageStatus(messageId: string): Observable<Message> {
    const url = `${this.baseUrl}/messages/${messageId}/read`;
    return this.http.put<Message>(url, {}).pipe(
      tap((message) => {
        this._messageDatabase.updateMessage(message);
      })
    );
  }

  /**
   * Actualizar un mensaje.
   * @param messageId ID del mensaje a actualizar.
   * @param updateMessage Datos del mensaje a actualizar.
   * @returns Observable con el mensaje actualizado.
   */
  updateMessage(messageId: string, updateMessage: UpdateMessage): Observable<Message> {
    const url = `${this.baseUrl}/messages/${messageId}`;
    return this.http.put<Message>(url, updateMessage).pipe(
      tap((message) => {
        this._messageDatabase.updateMessage(message);
      })
    );
  }

  /**
   * Eliminar un mensaje (eliminación no destructiva).
   * @param messageId ID del mensaje a eliminar.
   * @returns Observable<void>.
   */
  deleteMessage(messageId: string): Observable<void> {
    const url = `${this.baseUrl}/messages/${messageId}`;
    return this.http.delete<void>(url).pipe(
      tap(() => {                                                                                   
        this._messageDatabase.deleteMessage(messageId);
      })
    );
  }

  markMessagesAsRead(chatId: string, senderId: string): Observable<Message[]> {
    const url = `${this.baseUrl}/messages/mark-as-read`;
    return this.http.post<Message[]>(url, { chatId, senderId }).pipe(
      tap((messages) => {
        messages.forEach(message => this._messageDatabase.updateMessage(message));
        console.log('Mensajes marcados como leídos y sincronizados con cache local');
      })
    );
  }

  markMessagesAsReadLocal(chatId: string, senderId: string): Observable<void> {
    return from(this._messageDatabase.markMessagesAsRead(chatId, senderId));
  }

  getUnreadMessagesCount(chatId: string, senderId: string): Observable<number> {
    return from(this._messageDatabase.getUnreadMessagesCount(chatId, senderId)).pipe(
      switchMap((localCount) => {
        if (localCount !== null && localCount !== undefined) {
          return of(localCount);
        } else {
          const url = `${this.baseUrl}/messages/unread-count/${chatId}/${senderId}`;
          return this.http.get<number>(url);
        }
      }),
      catchError((error) => {
        console.error('Error obteniendo conteo local, intentando servidor:', error);
        const url = `${this.baseUrl}/messages/unread-count/${chatId}/${senderId}`;
        return this.http.get<number>(url).pipe(
          catchError((serverError) => {
            console.error('Error también en servidor:', serverError);
            return of(0);
          })
        );
      })
    );
  }

  getUnreadAllMessagesCount(): Observable<number> {
    return from(this._messageDatabase.getUnreadAllMessagesCount()).pipe(
      switchMap((localCount) => {
        if (localCount !== null && localCount !== undefined) {
          if (localCount > 0) {
            return this.syncReadStatusFromServer();
          } else {
            return of(localCount);
          }
        } else {
          return this.syncReadStatusFromServer();
        }
      }),
      catchError((error) => {
        console.error('Error obteniendo conteo total local, intentando servidor:', error);
        return this.syncReadStatusFromServer();
      })
    );
  }

  private getConversationsFromServer(currentUserId: string, otherUserId: string): Observable<Message[]> {
    const url = `${this.baseUrl}/messages/conversations/${otherUserId}`;
    return this.http.get<Message[]>(url).pipe(
      tap((messages) => {
        this._messageDatabase.addMessages(messages);
      })
    );
  }

  private getConversationsFromServerPaginated(currentUserId: string, otherUserId: string, page: number, size: number): Observable<{
    messages: Message[],
    total: number
  }> {
    const url = `${this.baseUrl}/messages/conversations/${otherUserId}?page=${page}&size=${size}`;
    return this.http.get<Message[]>(url).pipe(
      tap((messages) => {
        this._messageDatabase.addMessages(messages);
      }),
      map((messages: Message[]) => ({
        messages,
        total: messages.length
      }))
    );
  }

  private syncMessagesInBackground(chatId: string): void {
    setTimeout(() => {
      console.log('Sincronizando mensajes en segundo plano para chat:', chatId);
    }, 2000);
  }

  private syncMessagesSilently(chatId: string): void {
    setTimeout(() => {
      console.log('Sincronización silenciosa de mensajes para chat:', chatId);
    }, 3000);
  }

  syncSpecificMessage(messageId: string): Observable<Message | null> {
    if (!messageId || messageId === 'undefined' || messageId === 'null') {
      console.warn('ID de mensaje inválido:', messageId);
      return of(null);
    }
    
    const url = `${this.baseUrl}/messages/${messageId}`;
    
    return this.http.get<Message>(url).pipe(
      catchError((error) => {
        console.error('Error sincronizando mensaje específico:', error);
        return of(null);
      }),
      tap((message) => {
        if (message) {
          this._messageDatabase.addMessage(message);
          console.log(`Mensaje ${messageId} sincronizado`);
        }
      })
    );
  }

  forceSyncChat(currentUserId: string, otherUserId: string): Observable<Message[]> {
    console.log('Forzando sincronización completa del chat');
    return this.getConversationsFromServer(currentUserId, otherUserId);
  }

  getOnlyLocalMessages(chatId: string): Observable<Message[]> {
    return from(this._messageDatabase.getMessagesByChatId(chatId));
  }

  clearChatMessages(chatId: string): Observable<void> {
    return from(this._messageDatabase.clearMessagesByChatId(chatId));
  }

  clearAllMessages(): Observable<void> {
    return from(this._messageDatabase.clearAllMessages());
  }
  
  private generateChatId(userId1: string, userId2: string): string {
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
  }

  syncUnreadCountWhenNewMessage(messageId: string): Observable<number> {
    return this.syncSpecificMessage(messageId).pipe(
      switchMap((message) => {
        if (message) {
          return this.getUnreadAllMessagesCount();
        }
        return of(0);
      })
    );
  }

  syncReadStatusFromServer(): Observable<number> {
    const url = `${this.baseUrl}/messages/unread-all-count`;
    
    return this.http.get<number>(url).pipe(
      tap((serverCount) => {
        this.updateLocalReadStatus(serverCount);
      }),
      catchError((error) => {
        console.error('Error sincronizando estado de lectura:', error);
        return of(0);
      })
    );
  }

  private updateLocalReadStatus(serverCount: number): void {
    if (serverCount === 0) {
      this._messageDatabase.markAllMessagesAsRead().then(() => {
      });
    }
  }
}
