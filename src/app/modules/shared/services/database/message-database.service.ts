import { Injectable } from '@angular/core';
import { Message } from '../../../pages/messages/interfaces/message.interface';

@Injectable({
  providedIn: 'root'
})
export class MessageDatabaseService {
  private readonly DB_NAME = 'WorkyMessagesDB';
  private readonly DB_VERSION = 2;
  private readonly STORE_NAME = 'messages';
  private readonly MAX_MESSAGES = 1000;
  private db: IDBDatabase | null = null;

  async initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: '_id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('chatId', 'chatId', { unique: false });
          store.createIndex('senderId', 'senderId', { unique: false });
          store.createIndex('receiverId', 'receiverId', { unique: false });
          store.createIndex('isRead', 'isRead', { unique: false });
        }
      };
    });
  }

  async addMessage(message: Message): Promise<void> {
    if (!this.db) await this.initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const request = store.put(message);
      
      request.onsuccess = () => {
        this.ensureMaxMessages();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addMessages(messages: Message[]): Promise<void> {
    if (!this.db) await this.initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      let completed = 0;
      const total = messages.length;
      
      messages.forEach(message => {
        const request = store.put(message);
        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            this.ensureMaxMessages();
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getMessage(id: string): Promise<Message | null> {
    if (!this.db) await this.initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllMessages(): Promise<Message[]> {
    if (!this.db) await this.initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('createdAt');
      const request = index.getAll();
      
      request.onsuccess = () => {
        const messages = request.result as Message[];
        messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        resolve(messages);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getMessagesByChatId(chatId: string): Promise<Message[]> {
    if (!this.db) await this.initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('chatId');
      const request = index.getAll(chatId);
      
      request.onsuccess = () => {
        const messages = request.result as Message[];
        messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        resolve(messages);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getMessagesByChatIdPaginated(chatId: string, page: number, size: number): Promise<{
    messages: Message[],
    total: number
  }> {
    const allMessages = await this.getMessagesByChatId(chatId);
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;
    const paginatedMessages = allMessages.slice(startIndex, endIndex);
    
    return {
      messages: paginatedMessages,
      total: allMessages.length
    };
  }

  async getLastMessageByChatId(chatId: string): Promise<Message | null> {
    if (!this.db) await this.initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('chatId');
      const request = index.getAll(chatId);
      
      request.onsuccess = () => {
        const messages = request.result as Message[];
        if (messages.length > 0) {
          messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          resolve(messages[0]);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getUnreadMessagesCount(chatId: string, senderId: string): Promise<number> {
    if (!this.db) await this.initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const messages = request.result as Message[];
        const unreadCount = messages.filter(msg => 
          msg.chatId === chatId && 
          msg.senderId === senderId && 
          !msg.isRead
        ).length;
        resolve(unreadCount);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getUnreadAllMessagesCount(): Promise<number> {
    if (!this.db) await this.initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const messages = request.result as Message[];
        const unreadMessages = messages.filter(message => !message.isRead);
        resolve(unreadMessages.length);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateMessage(message: Message): Promise<void> {
    if (!this.db) await this.initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const request = store.put(message);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async markMessagesAsRead(chatId: string, senderId: string): Promise<void> {
    if (!this.db) await this.initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const messages = request.result as Message[];
        const messagesToUpdate = messages.filter(msg => 
          msg.chatId === chatId && 
          msg.senderId === senderId && 
          !msg.isRead
        );
        
        let completed = 0;
        const total = messagesToUpdate.length;
        
        if (total === 0) {
          resolve();
          return;
        }
        
        messagesToUpdate.forEach(message => {
          message.isRead = true;
          const updateRequest = store.put(message);
          updateRequest.onsuccess = () => {
            completed++;
            if (completed === total) {
              resolve();
            }
          };
          updateRequest.onerror = () => reject(updateRequest.error);
        });
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteMessage(id: string): Promise<void> {
    if (!this.db) await this.initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllMessages(): Promise<void> {
    if (!this.db) await this.initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearMessagesByChatId(chatId: string): Promise<void> {
    if (!this.db) await this.initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('chatId');
      const request = index.getAllKeys(chatId);
      
      request.onsuccess = () => {
        const keys = request.result as string[];
        let completed = 0;
        const total = keys.length;
        
        if (total === 0) {
          resolve();
          return;
        }
        
        keys.forEach(key => {
          const deleteRequest = store.delete(key);
          deleteRequest.onsuccess = () => {
            completed++;
            if (completed === total) {
              resolve();
            }
          };
          deleteRequest.onerror = () => reject(deleteRequest.error);
        });
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async ensureMaxMessages(): Promise<void> {
    const messages = await this.getAllMessages();
    
    if (messages.length > this.MAX_MESSAGES) {
      const messagesToDelete = messages.slice(this.MAX_MESSAGES);
      
      for (const message of messagesToDelete) {
        await this.deleteMessage(message._id);
      }
    }
  }

  async getMessageCount(): Promise<number> {
    if (!this.db) await this.initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.count();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async markAllMessagesAsRead(): Promise<void> {
    if (!this.db) await this.initDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const messages = request.result as Message[];
        const unreadMessages = messages.filter(msg => !msg.isRead);
        
        let completed = 0;
        const total = unreadMessages.length;
        
        if (total === 0) {
          resolve();
          return;
        }
        
        unreadMessages.forEach(message => {
          message.isRead = true;
          const updateRequest = store.put(message);
          updateRequest.onsuccess = () => {
            completed++;
            if (completed === total) {
              resolve();
            }
          };
          updateRequest.onerror = () => reject(updateRequest.error);
        });
      };
      request.onerror = () => reject(request.error);
    });
  }
} 
