import { Injectable } from '@angular/core';
import { CacheService } from './cache.service';
import { CookieService } from './cookie.service';

export interface StorageConfig {
  type: 'memory' | 'localStorage' | 'sessionStorage' | 'cookie';
  duration?: number;
  secure?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  constructor(
    private cacheService: CacheService,
    private cookieService: CookieService
  ) {}

  setUserData(key: string, value: any, config: StorageConfig = { type: 'localStorage' }): void {
    switch (config.type) {
      case 'memory':
        this.cacheService.setItem(key, value, config.duration || 30000);
        break;
      case 'localStorage':
        localStorage.setItem(`user_${key}`, JSON.stringify(value));
        break;
      case 'sessionStorage':
        sessionStorage.setItem(`user_${key}`, JSON.stringify(value));
        break;
      case 'cookie':
        this.cookieService.setCookie(key, JSON.stringify(value), config.duration ? config.duration / (24 * 60 * 60 * 1000) : 30, config.secure);
        break;
    }
  }

  getUserData(key: string, config: StorageConfig = { type: 'localStorage' }): any {
    switch (config.type) {
      case 'memory':
        return this.cacheService.getItem(key);
      case 'localStorage':
        const localData = localStorage.getItem(`user_${key}`);
        return localData ? JSON.parse(localData) : null;
      case 'sessionStorage':
        const sessionData = sessionStorage.getItem(`user_${key}`);
        return sessionData ? JSON.parse(sessionData) : null;
      case 'cookie':
        const cookieData = this.cookieService.getCookie(key);
        return cookieData ? JSON.parse(cookieData) : null;
      default:
        return null;
    }
  }

  setUserProfile(userId: string, profile: any): void {
    this.setUserData(`profile_${userId}`, profile, { type: 'localStorage' });
    this.cacheService.cacheUserProfile(userId, profile);
  }

  setUserPreferences(preferences: any): void {
    this.setUserData('preferences', preferences, { type: 'localStorage' });
    this.cookieService.setUserPreferences(preferences);
  }

  setAuthToken(token: string): void {
    this.setUserData('token', token, { type: 'localStorage' });
    this.cookieService.setAuthToken(token);
  }

  clearUserData(): void {
    this.cacheService.clear();
    localStorage.clear();
    sessionStorage.clear();
    this.cookieService.deleteCookie('auth_token');
    this.cookieService.deleteCookie('user_preferences');
  }
} 