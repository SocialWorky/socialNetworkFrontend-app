import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, switchMap, tap, catchError, map } from 'rxjs';
import { environment } from '@env/environment';
import { CreateMessage, Message, UpdateMessage } from '../interfaces/message.interface';
import { MessageDatabaseService } from '@shared/services/database/message-database.service';
import { AuthService } from '@auth/services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  private baseUrl: string;

  constructor(
    private http: HttpClient,
    private _messageDatabase: MessageDatabaseService,
    private _authService: AuthService
  ) {
    this.baseUrl = environment.APIMESSAGESERVICE;
    this._messageDatabase.initDatabase();
  }

  /**
   * Obtener usuarios con los que el usuario logeado tiene conversaciones.
   * @returns Observable con la lista de IDs de usuarios.
   */
  getUsersWithConversations(): Observable<string[]> {
    if (!this.baseUrl) {
      console.warn('APIMESSAGESERVICE not configured, using fallback');
      return of([]);
    }
    const url = `${this.baseUrl}/messages/users`;
    return this.http.get<string[]>(url).pipe(
      catchError((error) => {
        console.error('Error loading users with conversations:', error);
        return of([]);
      })
    );
  }

  /**
   * Verificar si el usuario tiene permisos de administrador en el backend.
   * @returns Observable con el resultado de la verificación.
   */
  verifyAdminPermissions(): Observable<{ hasAdminAccess: boolean; message?: string }> {
    if (!this.baseUrl) {
      return of({ hasAdminAccess: false, message: 'APIMESSAGESERVICE not configured' });
    }

    const decodedToken = this._authService.getDecodedToken();
    if (!decodedToken) {
      return of({ hasAdminAccess: false, message: 'No token found' });
    }

    if (decodedToken.role !== 'admin') {
      return of({ hasAdminAccess: false, message: `User role is ${decodedToken.role}, not admin` });
    }

    // Try to access a simple admin endpoint to verify permissions
    const url = `${this.baseUrl}/messages/statistics`;
    
    return this.http.get(url, { observe: 'response' }).pipe(
      map((response) => {
        return { hasAdminAccess: true };
      }),
      catchError((error) => {
        console.error('Admin permissions verification failed:', error);
        
        if (error.status === 403) {
          return of({ 
            hasAdminAccess: false, 
            message: 'User has admin role but lacks backend permissions' 
          });
        } else if (error.status === 401) {
          return of({ 
            hasAdminAccess: false, 
            message: 'Token is invalid or expired' 
          });
        } else {
          return of({ 
            hasAdminAccess: false, 
            message: `Backend error: ${error.status} - ${error.message}` 
          });
        }
      })
    );
  }

  /**
   * Obtener estadísticas básicas de mensajes (fallback para usuarios no admin).
   * @returns Observable con estadísticas básicas.
   */
  getBasicMessagesStatistics(): Observable<{
    totalMessages: number;
    unreadMessages: number;
    activeConversations: number;
    totalConversations: number;
    messagesToday: number;
    averageMessagesPerConversation: number;
  }> {
    // Try to get unread count as a basic metric
    return this.getUnreadAllMessagesCount().pipe(
      map((unreadCount) => {
        return {
          totalMessages: 0, // Not available for non-admin users
          unreadMessages: unreadCount,
          activeConversations: 0, // Not available for non-admin users
          totalConversations: 0, // Not available for non-admin users
          messagesToday: 0, // Not available for non-admin users
          averageMessagesPerConversation: 0 // Not available for non-admin users
        };
      }),
      catchError((error) => {
        console.error('Error getting basic messages statistics:', error);
        return of({
          totalMessages: 0,
          unreadMessages: 0,
          activeConversations: 0,
          totalConversations: 0,
          messagesToday: 0,
          averageMessagesPerConversation: 0
        });
      })
    );
  }

  /**
   * Obtener estadísticas completas de mensajes.
   * @returns Observable con las estadísticas de mensajes.
   */
  getMessagesStatistics(): Observable<{
    totalMessages: number;
    unreadMessages: number;
    activeConversations: number;
    totalConversations: number;
    messagesToday: number;
    averageMessagesPerConversation: number;
  }> {
    if (!this.baseUrl) {
      console.warn('APIMESSAGESERVICE not configured, using fallback');
      return of({
        totalMessages: 0,
        unreadMessages: 0,
        activeConversations: 0,
        totalConversations: 0,
        messagesToday: 0,
        averageMessagesPerConversation: 0
      });
    }

    // Check if user has admin role (token is handled by interceptor)
    const decodedToken = this._authService.getDecodedToken();
    if (!decodedToken || decodedToken.role !== 'admin') {
      console.warn('User does not have admin role. Current role:', decodedToken?.role);
      return this.getBasicMessagesStatistics();
    }

    const url = `${this.baseUrl}/messages/statistics`;
    
    return this.http.get<{
      totalMessages: number;
      unreadMessages: number;
      activeConversations: number;
      totalConversations: number;
      messagesToday: number;
      averageMessagesPerConversation: number;
    }>(url).pipe(
      catchError((error) => {
        console.error('Error loading messages statistics:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        console.error('Error details:', error.error);
        
        if (error.status === 403) {
          console.error('Access forbidden. Check if user has admin role or proper permissions.');
          console.error('Current user role:', this._authService.getDecodedToken()?.role);
          console.error('Current user ID:', this._authService.getDecodedToken()?.id);
          console.error('Token from localStorage:', localStorage.getItem('token')?.substring(0, 50) + '...');
          
          // Try to get more information about the token
          try {
            const token = localStorage.getItem('token');
            if (token) {
              const decoded = this._authService.getDecodedToken();
              console.error('Decoded token info:', {
                id: decoded?.id,
                email: decoded?.email,
                role: decoded?.role,
                username: decoded?.username
              });
            }
          } catch (tokenError) {
            console.error('Error decoding token:', tokenError);
          }
          
          // Use basic statistics as fallback for 403 errors
          return this.getBasicMessagesStatistics();
        } else if (error.status === 401) {
          console.error('Unauthorized. Token may be invalid or expired.');
        } else if (error.status === 404) {
          console.error('Endpoint not found. Check if the endpoint exists in the backend.');
        } else if (error.status === 0) {
          console.error('Network error. Check if the service is accessible.');
        }
        
        return of({
          totalMessages: 0,
          unreadMessages: 0,
          activeConversations: 0,
          totalConversations: 0,
          messagesToday: 0,
          averageMessagesPerConversation: 0
        });
      })
    );
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
        if (localMessages.length > 0) {
          this.syncMessagesInBackground(chatId);
          return of(localMessages);
        } else {
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
        if (localData.messages.length > 0) {
          if (page === 1) {
            this.syncMessagesSilently(chatId);
          }
          return of(localData);
        } else {
          // Si no hay datos locales, cargar desde servidor pero limitar la respuesta
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
      map((messages: Message[]) => {
        // Ordenar mensajes por timestamp
        messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        const total = messages.length;
        let paginatedMessages = messages;
        
        if (page === 1) {
          // Para la primera página, tomar los últimos 'size' mensajes
          paginatedMessages = messages.slice(-size);
        } else {
          // Para páginas posteriores, calcular el rango correcto
          const startIndex = Math.max(0, total - (page * size));
          const endIndex = Math.max(0, total - ((page - 1) * size));
          paginatedMessages = messages.slice(startIndex, endIndex);
        }
        
        return {
          messages: paginatedMessages,
          total: total
        };
      })
    );
  }

  private syncMessagesInBackground(chatId: string): void {
    setTimeout(() => {
    }, 2000);
  }

  private syncMessagesSilently(chatId: string): void {
    setTimeout(() => {
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
        }
      })
    );
  }

  forceSyncChat(currentUserId: string, otherUserId: string): Observable<Message[]> {
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
  
  public generateChatId(userId1: string, userId2: string): string {
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
    if (!this.baseUrl) {
      console.warn('APIMESSAGESERVICE not configured, using fallback');
      return of(0);
    }
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