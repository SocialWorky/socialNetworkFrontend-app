# Cache System

The cache system provides intelligent data caching with multiple storage strategies for optimal performance in the social network application.

## Overview

The cache system consists of three main services:
- `CacheService` - Core caching functionality with memory and persistent storage
- `CookieService` - Secure cookie management for sensitive data
- `StorageService` - Unified interface for different storage types

## CacheService

### Basic Usage

```typescript
import { Component } from '@angular/core';
import { CacheService } from '@shared/services/cache.service';

@Component({
  selector: 'app-example',
  templateUrl: './example.component.html',
})
export class ExampleComponent {
  constructor(private cacheService: CacheService) {}

  cacheUserData() {
    // Cache in memory only (30 seconds default)
    this.cacheService.setItem('temp_data', { id: 1, name: 'John' });
    
    // Cache with custom duration
    this.cacheService.setItem('user_session', userData, 5 * 60 * 1000); // 5 minutes
    
    // Cache persistently (localStorage)
    this.cacheService.setItem('user_preferences', preferences, 24 * 60 * 60 * 1000, true);
  }

  retrieveData() {
    // Get from memory
    const tempData = this.cacheService.getItem('temp_data');
    
    // Get from persistent storage
    const preferences = this.cacheService.getItem('user_preferences', true);
  }
}
```

### Social Network Specific Methods

```typescript
// Cache user profile for 24 hours
this.cacheService.cacheUserProfile(userId, profileData);

// Cache publications for 15 minutes
this.cacheService.cachePublications(pageNumber, publicationsArray);

// Cache notifications for 5 minutes (memory only)
this.cacheService.cacheNotifications(notificationsArray);
```

### Cache Management

```typescript
// Remove specific item
this.cacheService.removeItem('user_data', true); // Remove from persistent storage

// Clear all cache
this.cacheService.clear(); // Memory only
this.cacheService.clear(true); // Memory and persistent
```

## CookieService

### Secure Cookie Management

```typescript
import { CookieService } from '@shared/services/cookie.service';

export class AuthComponent {
  constructor(private cookieService: CookieService) {}

  setAuthToken(token: string) {
    // Secure cookie for authentication (7 days)
    this.cookieService.setAuthToken(token);
  }

  setUserPreferences(preferences: any) {
    // Regular cookie for preferences (30 days)
    this.cookieService.setUserPreferences(preferences);
  }

  setTheme(theme: string) {
    // Long-term cookie for theme (1 year)
    this.cookieService.setThemePreference(theme);
  }
}
```

## StorageService

### Unified Storage Interface

```typescript
import { StorageService, StorageConfig } from '@shared/services/storage.service';

export class DataComponent {
  constructor(private storageService: StorageService) {}

  storeData() {
    // Memory storage (frequent access)
    this.storageService.setUserData('temp_data', data, { type: 'memory' });
    
    // LocalStorage (occasional access)
    this.storageService.setUserData('user_data', data, { type: 'localStorage' });
    
    // SessionStorage (session only)
    this.storageService.setUserData('session_data', data, { type: 'sessionStorage' });
    
    // Cookie (long-term, secure)
    this.storageService.setUserData('auth_token', token, { 
      type: 'cookie', 
      secure: true 
    });
  }

  // Social network specific methods
  setUserProfile(userId: string, profile: any) {
    this.storageService.setUserProfile(userId, profile);
  }

  setAuthToken(token: string) {
    this.storageService.setAuthToken(token);
  }
}
```

## Development Mode

### Setup

1. **Environment Configuration**

```typescript:src/environments/environment.dev.ts
export const environment = {
  PRODUCTION: false,
  CACHE_ENABLED: true,
  CACHE_DEBUG: true,
  API_URL: 'http://localhost:3000/api',
  // ... other config
};
```

2. **DevCacheService Integration**

```typescript:src/app/app.component.ts
import { DevCacheService } from '@shared/services/dev-cache.service';

export class AppComponent {
  constructor(private devCacheService: DevCacheService) {}

  ngOnInit() {
    if (!environment.PRODUCTION) {
      this.setupDevMode();
    }
  }

  private setupDevMode() {
    // Generate mock data for development
    this.devCacheService.generateMockData();
  }
}
```

### Development Tools

#### Browser Console Commands

```javascript
// Cache statistics
devCache.stats()
// Returns: { localStorage: 5, memory: 3, total: 8 }

// Inspect specific cache item
devCache.inspect('user_profile_123')
// Returns: { memory: {...}, localStorage: {...} }

// Clear all cache
devCache.clear()

// Generate mock data
devCache.mockData()
```

#### NPM Scripts

```bash
# Start with cache debugging
npm run start:dev:cache

# Clear development cache
npm run cache:clear

# Start with mock API
npm run dev:mock
```

### Debug Configuration

```typescript:src/app/modules/shared/services/dev-cache.service.ts
// Enable cache debugging in development
if (environment.CACHE_DEBUG) {
  console.group('🔧 Cache Operation');
  console.log('Operation:', operation);
  console.log('Key:', key);
  console.log('Data:', data);
  console.groupEnd();
}
```

## Cache Strategies

### Memory Cache
- **Use case**: Frequently accessed data
- **Duration**: 30 seconds default
- **Examples**: Notifications, temporary UI state
- **Access**: Fastest

### LocalStorage Cache
- **Use case**: User preferences, profiles
- **Duration**: Configurable (hours to days)
- **Examples**: User profiles, theme preferences
- **Access**: Fast, persists between sessions

### Cookie Cache
- **Use case**: Authentication, long-term preferences
- **Duration**: Days to years
- **Examples**: Auth tokens, language settings
- **Access**: Secure, cross-tab sharing

## Best Practices

### 1. Choose Appropriate Storage

```typescript
// ✅ Good: Frequent data in memory
this.cacheService.setItem('notifications', notifications, 5 * 60 * 1000);

// ✅ Good: User data in localStorage
this.cacheService.setItem('user_profile', profile, 24 * 60 * 60 * 1000, true);

// ✅ Good: Auth tokens in cookies
this.cookieService.setAuthToken(token);
```

### 2. Handle Cache Misses

```typescript
getUserProfile(userId: string) {
  // Try cache first
  const cached = this.cacheService.getItem(`user_profile_${userId}`, true);
  
  if (cached) {
    return of(cached);
  }
  
  // Fallback to API
  return this.userService.getUser(userId).pipe(
    tap(profile => this.cacheService.cacheUserProfile(userId, profile))
  );
}
```

### 3. Cache Invalidation

```typescript
updateUserProfile(userId: string, newProfile: any) {
  return this.userService.updateProfile(userId, newProfile).pipe(
    tap(() => {
      // Invalidate old cache
      this.cacheService.removeItem(`user_profile_${userId}`, true);
      // Set new cache
      this.cacheService.cacheUserProfile(userId, newProfile);
    })
  );
}
```

### 4. Error Handling

```typescript
// The cache system automatically handles errors and logs them
// No additional error handling needed in components
const data = this.cacheService.getItem('key', true);
if (data) {
  // Use cached data
} else {
  // Handle cache miss
}
```

## Performance Monitoring

### Cache Hit Rate

```typescript
// Monitor cache effectiveness
const cacheStats = devCache.stats();
const hitRate = (cacheStats.memory + cacheStats.localStorage) / totalRequests;
```

### Memory Usage

```typescript
// Check localStorage usage
const localStorageSize = new Blob(
  Object.keys(localStorage).map(key => localStorage[key])
).size;
console.log('localStorage size:', localStorageSize, 'bytes');
```

## Troubleshooting

### Common Issues

1. **Cache not persisting**
   - Check if `persistent: true` is set
   - Verify localStorage is available

2. **Cache clearing unexpectedly**
   - Check cache version compatibility
   - Verify timestamp expiration

3. **Memory leaks**
   - Use `clear()` method when appropriate
   - Monitor cache size in development

### Debug Commands

```javascript
// In browser console
// Check all cache keys
Object.keys(localStorage).filter(key => key.startsWith('cache_'))

// Check cache version
JSON.parse(localStorage.getItem('cache_user_profile_123')).version

// Force cache cleanup
devCache.clear()
```

## Migration Guide

### From Old Cache System

```typescript
// Old way
localStorage.setItem('user_data', JSON.stringify(data));

// New way
this.cacheService.setItem('user_data', data, 24 * 60 * 60 * 1000, true);
```

### From Console Logs

```typescript
// Old way
console.error('Cache error:', error);

// New way
this.logService.log(LevelLogEnum.ERROR, 'ComponentName', 'Cache error', { error });
```

```markdown:docs/development-cache-guide.md
# Development Cache Guide

This guide explains how to work with the cache system during development.

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env-example .env.local

# Edit environment variables
NG_APP_CACHE_ENABLED=true
NG_APP_CACHE_DEBUG=true
NG_APP_API_URL=http://localhost:3000/api
```

### 2. Start Development Server

```bash
# Start with cache debugging
npm run start:dev:cache

# Or start with mock data
npm run dev:mock
```

### 3. Access Development Tools

Open browser console and use:

```javascript
// Check cache status
devCache.stats()

// Generate test data
devCache.mockData()

// Clear cache
devCache.clear()
```

## Development Workflow

### 1. Testing Cache Behavior

```typescript
// In your component
export class TestComponent {
  constructor(private cacheService: CacheService) {}

  testCache() {
    // Set test data
    this.cacheService.setItem('test_key', { test: 'data' }, 60000, true);
    
    // Check in browser console
    console.log(devCache.inspect('test_key'));
  }
}
```

### 2. Mock Data Generation

```typescript
// Automatic mock data on app start
if (!environment.PRODUCTION) {
  this.devCacheService.generateMockData();
}

// Manual mock data
devCache.mockData();
```

### 3. Cache Inspection

```javascript
// In browser console
// View all cache items
devCache.stats()

// Inspect specific item
devCache.inspect('user_profile_dev-user-1')

// Check cache structure
JSON.parse(localStorage.getItem('cache_user_profile_dev-user-1'))
```

## Debug Features

### Cache Operation Logging

When `CACHE_DEBUG=true`, all cache operations are logged:

```
�� Cache setItem
Key: user_profile_123
Data: { id: 123, name: "John" }
Timestamp: 2024-01-15T10:30:00.000Z
``` 