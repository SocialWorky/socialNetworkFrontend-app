/**
 * Mobile-specific cache cleanup script
 */

console.log('🧹 Cleaning mobile cache...');

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

// Clear IndexedDB (if available)
if ('indexedDB' in window) {
  indexedDB.databases().then(databases => {
    databases.forEach(db => {
      if (db.name.includes('Mobile') || db.name.includes('Cache')) {
        indexedDB.deleteDatabase(db.name);
      }
    });
  });
}

console.log('✅ Mobile cache cleaned');
