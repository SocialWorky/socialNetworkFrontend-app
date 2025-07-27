/**
 * Script para forzar la actualización del Service Worker
 * Útil durante el desarrollo para probar las actualizaciones
 */

function forceServiceWorkerUpdate() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        registration.update();
      }
    });
  }
}

function clearServiceWorkerCache() {
  if ('caches' in window) {
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    });
  }
}

function unregisterServiceWorkers() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        registration.unregister();
      }
    });
  }
}

function reloadPage() {
  window.location.reload();
}

function forceCompleteUpdate() {
  clearServiceWorkerCache();
  unregisterServiceWorkers();
  setTimeout(() => {
    reloadPage();
  }, 1000);
}

// Función para limpiar localStorage relacionado con PWA
function clearPWALocalStorage() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('ngsw') || key.includes('pwa') || key.includes('update'))) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    console.log('Removing localStorage key:', key);
    localStorage.removeItem(key);
  });
}

// Función para limpiar sessionStorage relacionado con PWA
function clearPWASessionStorage() {
  const keysToRemove = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.includes('ngsw') || key.includes('pwa') || key.includes('update'))) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    console.log('Removing sessionStorage key:', key);
    sessionStorage.removeItem(key);
  });
}

// Función principal para limpiar todo el cache de PWA
async function clearPWACache() {
  console.log('🧹 Starting PWA cache cleanup...');
  
  clearServiceWorkerCache();
  unregisterServiceWorkers();
  clearPWALocalStorage();
  clearPWASessionStorage();
  
  console.log('✅ PWA cache cleanup completed');
  console.log('🔄 Reloading page in 2 seconds...');
  
  setTimeout(() => {
    window.location.reload();
  }, 2000);
}

// Función para verificar estado del Service Worker
async function showServiceWorkerStatus() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log('📋 Service Worker Status:');
    console.log('- Registrations found:', registrations.length);
    
    registrations.forEach((registration, index) => {
      console.log(`  ${index + 1}. Scope: ${registration.scope}`);
      console.log(`     Active: ${!!registration.active}`);
      console.log(`     Installing: ${!!registration.installing}`);
      console.log(`     Waiting: ${!!registration.waiting}`);
    });
    
    return registrations;
  } else {
    console.log('❌ Service Workers not supported');
    return [];
  }
}

// Función para verificar cache disponible
async function showCacheStatus() {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    console.log('📋 Cache Status:');
    console.log('- Caches found:', cacheNames.length);
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      console.log(`  ${cacheName}: ${keys.length} items`);
    }
    
    return cacheNames;
  } else {
    console.log('❌ Cache API not supported');
    return [];
  }
}

// Función para mostrar estado completo
async function showServiceWorkerStatus() {
  console.log('🔍 PWA Status Report');
  console.log('==================');
  
  await showServiceWorkerStatus();
  console.log('');
  await showCacheStatus();
  console.log('');
  
  console.log('📱 PWA Support:');
  console.log('- Service Workers:', 'serviceWorker' in navigator);
  console.log('- Cache API:', 'caches' in window);
  console.log('- Push API:', 'PushManager' in window);
  console.log('- Notification API:', 'Notification' in window);
}

// Exportar funciones para uso global
window.PWAUtils = {
  forceServiceWorkerUpdate,
  clearServiceWorkerCache,
  unregisterServiceWorkers,
  reloadPage,
  forceCompleteUpdate,
  clearPWALocalStorage,
  clearPWASessionStorage,
  clearPWACache,
  showServiceWorkerStatus,
  showCacheStatus
};


