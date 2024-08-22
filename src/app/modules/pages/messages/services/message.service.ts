import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { CreateMessage, Message, UpdateMessage } from '../interfaces/message.interface';

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  private baseUrl: string;
  private token: string;

  constructor(private http: HttpClient) {
    this.baseUrl = environment.APIMESSAGESERVICE;
    this.token = localStorage.getItem('token') || '';
  }

  private getHeaders(): HttpHeaders {
    const token = this.token;
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return headers;
  }

  /**
   * Obtener usuarios con los que el usuario logeado tiene conversaciones.
   * @returns Observable con la lista de IDs de usuarios.
   */
  getUsersWithConversations(): Observable<string[]> {
    const url = `${this.baseUrl}/messages/users`;
    const headers = this.getHeaders();
    return this.http.get<string[]>(url, { headers });
  }

  /**
   * Obtener las conversaciones del usuario logeado con otro usuario específico.
   * @param currentUserId ID del usuario logeado.
   * @param otherUserId ID del otro usuario.
   * @returns Observable con la lista de mensajes.
   */
  getConversationsWithUser(currentUserId: string, otherUserId: string): Observable<Message[]> {
    const url = `${this.baseUrl}/messages/conversations/${otherUserId}`;
    const headers = this.getHeaders();
    return this.http.get<Message[]>(url, { headers });
  }

  /**
   * Obtener la última conversación del usuario logeado con otro usuario específico.
   * @param otherUserId ID del otro usuario.
   * @returns Observable con el último mensaje.
   */
  getLastConversationWithUser(otherUserId: string): Observable<Message> {
    const url = `${this.baseUrl}/messages/conversations/${otherUserId}/last`;
    const headers = this.getHeaders();
    return this.http.get<Message>(url, { headers });
  }

  /**
   * Contar el número de conversaciones del usuario logeado con otro usuario específico.
   * @param otherUserId ID del otro usuario.
   * @returns Observable con el número de conversaciones.
   */
  countConversationsWithUser(otherUserId: string): Observable<number> {
    const url = `${this.baseUrl}/messages/conversations/${otherUserId}/count`;
    const headers = this.getHeaders();
    return this.http.get<number>(url, { headers });
  }

  /**
   * Obtener las conversaciones del usuario logeado entre dos fechas específicas.
   * @param startDate Fecha de inicio en formato dd/mm/aaaa.
   * @param endDate Fecha de fin en formato dd/mm/aaaa.
   * @returns Observable con la lista de mensajes.
   */
  getConversationsByDate(startDate: string, endDate: string): Observable<Message[]> {
    const url = `${this.baseUrl}/messages/conversations/date?startDate=${startDate}&endDate=${endDate}`;
    const headers = this.getHeaders();
    return this.http.get<Message[]>(url, { headers });
  }

  /**
   * Crear un nuevo mensaje.
   * @param createMessage Datos del mensaje a crear.
   * @returns Observable con el mensaje creado.
   */
  createMessage(createMessage: CreateMessage): Observable<Message> {
    const url = `${this.baseUrl}/messages`;
    const headers = this.getHeaders();
    return this.http.post<Message>(url, createMessage, { headers });
  }

  /**
   * Actualizar el estado de lectura de un mensaje.
   * @param messageId ID del mensaje a actualizar.
   * @returns Observable con el mensaje actualizado.
   */
  updateMessageStatus(messageId: string): Observable<Message> {
    const url = `${this.baseUrl}/messages/${messageId}/read`;
    const headers = this.getHeaders();
    return this.http.put<Message>(url, {}, { headers });
  }

  /**
   * Actualizar un mensaje.
   * @param messageId ID del mensaje a actualizar.
   * @param updateMessage Datos del mensaje a actualizar.
   * @returns Observable con el mensaje actualizado.
   */
  updateMessage(messageId: string, updateMessage: UpdateMessage): Observable<Message> {
    const url = `${this.baseUrl}/messages/${messageId}`;
    const headers = this.getHeaders();
    return this.http.put<Message>(url, updateMessage, { headers });
  }

  /**
   * Eliminar un mensaje (eliminación no destructiva).
   * @param messageId ID del mensaje a eliminar.
   * @returns Observable<void>.
   */
  deleteMessage(messageId: string): Observable<void> {
    const url = `${this.baseUrl}/messages/${messageId}`;
    const headers = this.getHeaders();
    return this.http.delete<void>(url, { headers });
  }

  markMessagesAsRead(chatId: string, senderId: string): Observable<Message[]> {
    const url = `${this.baseUrl}/messages/mark-as-read`;
    const headers = this.getHeaders();
    return this.http.post<Message[]>(url, { chatId, senderId }, { headers });
  }

  getUnreadMessagesCount(chastId:string, senderId:string): Observable<number> {
    const url = `${this.baseUrl}/messages/unread-count/${chastId}/${senderId}`;
    const headers = this.getHeaders();
    return this.http.get<number>(url, { headers });
  }

  getUnreadAllMessagesCount(): Observable<number> {
    const url = `${this.baseUrl}/messages/unread-all-count`;
    const headers = this.getHeaders();
    return this.http.get<number>(url, { headers });
  }
}
