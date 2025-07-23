import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CookieService {
  private readonly COOKIE_PREFIX = 'worky_';
  private readonly SECURE_COOKIES = ['auth_token', 'session_id'];
  private readonly MAX_AGE = 30 * 24 * 60 * 60;

  setCookie(name: string, value: string, days: number = 30, secure: boolean = false): void {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    
    let cookieString = `${this.COOKIE_PREFIX}${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/`;
    
    if (secure || this.SECURE_COOKIES.includes(name)) {
      cookieString += '; secure; samesite=strict';
    }
    
    if (location.hostname === 'localhost') {
      cookieString += '; samesite=lax';
    }
    
    document.cookie = cookieString;
  }

  getCookie(name: string): string | null {
    const nameEQ = `${this.COOKIE_PREFIX}${name}=`;
    const ca = document.cookie.split(';');
    
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
    return null;
  }

  deleteCookie(name: string): void {
    this.setCookie(name, '', -1);
  }

  setAuthToken(token: string): void {
    this.setCookie('auth_token', token, 7, true);
  }

  setUserPreferences(preferences: any): void {
    this.setCookie('user_preferences', JSON.stringify(preferences), 30);
  }

  setThemePreference(theme: string): void {
    this.setCookie('theme', theme, 365);
  }

  setLanguagePreference(lang: string): void {
    this.setCookie('language', lang, 365);
  }
} 