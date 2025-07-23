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
 Cache setItem
Key: user_profile_123
Data: { id: 123, name: "John" }
Timestamp: 2024-01-15T10:30:00.000Z
```

### Performance Monitoring

```javascript
<code_block_to_apply_changes_from>
```

### Memory Usage Tracking

```javascript
// Monitor localStorage usage
const keys = Object.keys(localStorage).filter(k => k.startsWith('cache_'));
const size = keys.reduce((acc, key) => acc + localStorage[key].length, 0);
console.log('Cache size:', size, 'characters');
```

## Common Development Scenarios

### 1. Testing Cache Expiration

```typescript
// Set short-lived cache for testing
this.cacheService.setItem('test_expire', data, 5000); // 5 seconds

// Wait and check
setTimeout(() => {
  const result = this.cacheService.getItem('test_expire');
  console.log('Expired:', result === null);
}, 6000);
```

### 2. Testing Persistent Storage

```typescript
// Set persistent cache
this.cacheService.setItem('persistent_test', data, 60000, true);

// Refresh page and check
// Data should still be available
const result = this.cacheService.getItem('persistent_test', true);
```

### 3. Testing Cache Versioning

```typescript
// Simulate version change
localStorage.setItem('cache_test', JSON.stringify({
  value: 'old_data',
  timestamp: Date.now() + 60000,
  version: '0.9.0' // Old version
}));

// Try to get (should return null due to version mismatch)
const result = this.cacheService.getItem('test', true);
console.log('Version mismatch result:', result);
```

## Troubleshooting Development Issues

### Cache Not Working

```javascript
// Check if cache is enabled
console.log('Cache enabled:', environment.CACHE_ENABLED);

// Check localStorage availability
console.log('localStorage available:', typeof localStorage !== 'undefined');

// Check cache service injection
console.log('CacheService available:', !!this.cacheService);
```

### Mock Data Not Loading

```javascript
// Check if mock data exists
devCache.stats()

// Regenerate mock data
devCache.mockData()

// Check specific mock items
devCache.inspect('user_profile_dev-user-1')
```

### Performance Issues

```javascript
// Profile cache operations
console.time('cache_operation');
cacheService.getItem('key', true);
console.timeEnd('cache_operation');

// Check cache size
const stats = devCache.stats();
console.log('Cache items:', stats.total);
```

## Development Scripts

### Package.json Scripts

```json
{
  "scripts": {
    "start:dev": "ng serve --configuration development",
    "start:dev:cache": "CACHE_DEBUG=true ng serve --configuration development",
    "dev:mock": "ng serve --configuration development && node scripts/mock-api.js",
    "cache:clear": "node scripts/clear-cache.js",
    "cache:inspect": "node scripts/inspect-cache.js"
  }
}
```

### Custom Scripts

```javascript:scripts/clear-cache.js
const fs = require('fs');
const path = require('path');

console.log('🧹 Clearing development cache...');

// Clear Angular cache
const cacheDir = path.join(__dirname, '../.angular/cache');
if (fs.existsSync(cacheDir)) {
  fs.rmSync(cacheDir, { recursive: true, force: true });
}

// Clear dist folder
const distDir = path.join(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}

console.log('✅ Cache cleared successfully!');
```

## Best Practices for Development

### 1. Use Mock Data

```typescript
// Always use mock data in development
if (!environment.PRODUCTION) {
  this.devCacheService.generateMockData();
}
```

### 2. Monitor Cache Size

```typescript
// Regular cache size checks
setInterval(() => {
  const stats = devCache.stats();
  if (stats.total > 50) {
    console.warn('Cache size is getting large:', stats.total);
  }
}, 30000);
```

### 3. Test Cache Scenarios

```typescript
// Test different cache scenarios
testCacheScenarios() {
  // Test memory cache
  this.cacheService.setItem('memory_test', data);
  
  // Test persistent cache
  this.cacheService.setItem('persistent_test', data, 60000, true);
  
  // Test expiration
  this.cacheService.setItem('expire_test', data, 1000);
}
```

### 4. Use Development Tools

```javascript
// Always use dev tools for debugging
devCache.stats() // Check cache status
devCache.inspect('key') // Inspect specific items
devCache.clear() // Clear when needed
```

This development guide ensures efficient cache testing and debugging during development.
```

Estos documentos proporcionan una guía completa para usar el sistema de caché tanto en producción como en desarrollo, siguiendo las mejores prácticas y manteniendo el código limpio y eficiente. 