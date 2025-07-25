#!/usr/bin/env node

/**
 * Mobile Cache Cleanup Script
 * Cleans up old cache entries for mobile optimization
 */

console.log('🧹 Cleaning up mobile cache...');

// Clear Service Worker cache
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
    });
  });
}

// Clear browser cache
if ('caches' in window) {
  caches.keys().then(cacheNames => {
    return Promise.all(
      cacheNames.map(cacheName => {
        if (cacheName.includes('mobile') || cacheName.includes('images')) {
          return caches.delete(cacheName);
        }
      })
    );
  });
}

console.log('✅ Mobile cache cleaned up');
