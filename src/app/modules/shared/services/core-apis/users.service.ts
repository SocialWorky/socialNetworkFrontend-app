import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { LogService, LevelLogEnum } from './log.service';

import { User } from '@shared/interfaces/user.interface';
import { environment } from '@env/environment';

interface CachedUser {
  user: User;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private baseUrl = environment.API_URL;
  
  // Intelligent cache for users
  private userCache = new Map<string, CachedUser>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100; // Maximum 100 users in cache

  constructor(
    private http: HttpClient,
    private logService: LogService
  ) {
    // Clean expired cache every 10 minutes
    setInterval(() => this.cleanExpiredCache(), 10 * 60 * 1000);
  }

  private handleError(error: any) {
    this.logService.log(
      LevelLogEnum.ERROR,
      'UserService',
      'API request failed',
      { 
        url: error.url, 
        status: error.status, 
        error: error instanceof Error ? error.message : String(error) 
      }
    );
    return throwError(() => new Error('Something went wrong; please try again later.'));
  }

  /**
   * Get user by ID with intelligent cache
   */
  getUserById(id: string): Observable<User> {
    // Check cache first
    const cached = this.userCache.get(id);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return of(cached.user);
    }

    // If not in cache or expired, make server call
    const url = `${this.baseUrl}/user/${id}`;
    return this.http.get<User>(url).pipe(
      tap(user => {
        this.addToCache(id, user);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Search users with optional limit
   */
  searchUsers(limit?: number): Observable<User[]> {
    const url = `${this.baseUrl}/user?limit=${limit}`;
    return this.http.get<User[]>(url).pipe(
      tap(users => {
        // Cache found users
        users.forEach(user => this.addToCache(user._id, user));
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get all users
   */
  getAllUsers(): Observable<User[]> {
    const url = `${this.baseUrl}/user`;
    return this.http.get<User[]>(url).pipe(
      tap(users => {
        // Cache all users
        users.forEach(user => this.addToCache(user._id, user));
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get user by username
   */
  getUserByName(name: string): Observable<User> {
    const url = `${this.baseUrl}/user/username/${name}`;
    return this.http.get<User>(url).pipe(
      tap(user => {
        // Cache by found user ID
        this.addToCache(user._id, user);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Update user and refresh cache
   */
  userEdit(id: string, data: any): Observable<User> {
    const url = `${this.baseUrl}/user/edit/${id}`;
    
    return this.http.put<User>(url, data).pipe(
      tap((updatedUser) => {
        // Update cache with refreshed data
        this.addToCache(id, updatedUser);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Check if two users are friends
   */
  getUserFriends(_id: string, _idRequest: string): Observable<boolean> {
    const url = `${this.baseUrl}/user/friends/${_id}/${_idRequest}`;
    return this.http.get<boolean>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get user friends
   */
  getMyFriends(_id: string): Observable<User[]> {
    const url = `${this.baseUrl}/user/myfriends/${_id}`;
    return this.http.get<User[]>(url).pipe(
      tap(users => {
        // Cache found friends
        users.forEach(user => this.addToCache(user._id, user));
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get pending friendship requests
   */
  getFriendsPending(_id: string, _idRequest: string): Observable<{ status: boolean; _id: string }> {
    const url = `${this.baseUrl}/user/pending-friend/${_id}/${_idRequest}`;
    return this.http.get<{ status: boolean; _id: string }>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Add user to cache
   */
  private addToCache(id: string, user: User): void {
    // Clean cache if full
    if (this.userCache.size >= this.MAX_CACHE_SIZE) {
      this.cleanExpiredCache();
      // If still full, remove oldest
      if (this.userCache.size >= this.MAX_CACHE_SIZE) {
        const oldestKey = this.userCache.keys().next().value;
        this.userCache.delete(oldestKey);
      }
    }

    this.userCache.set(id, {
      user,
      timestamp: Date.now()
    });
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  /**
   * Clean expired cache
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.userCache.entries()) {
      if (!this.isCacheValid(cached.timestamp)) {
        this.userCache.delete(key);
      }
    }
  }

  /**
   * Invalidate cache for specific user
   */
  invalidateUserCache(userId: string): void {
    this.userCache.delete(userId);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.userCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.userCache.size,
      maxSize: this.MAX_CACHE_SIZE,
      hitRate: 0 // TODO: Implement hit rate metrics
    };
  }
}
