/**
 * Script para limpiar cache de PWA y forzar actualizaciones
 * Útil para resolver problemas de cache en producción
 */

// Función para limpiar cache del Service Worker
async function clearServiceWorkerCache() {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log('Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
      console.log('✅ All caches cleared successfully');
      return true;
    } catch (error) {
      console.error('❌ Error clearing caches:', error);
      return false;
    }
  }
  return false;
}

// Función para desregistrar Service Workers
async function unregisterServiceWorkers() {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(registration => {
          console.log('Unregistering service worker:', registration.scope);
          return registration.unregister();
        })
      );
      console.log('✅ All service workers unregistered');
      return true;
    } catch (error) {
      console.error('❌ Error unregistering service workers:', error);
      return false;
    }
  }
  return false;
}

// Función para limpiar localStorage relacionado con PWA
function clearPWALocalStorage() {
  try {
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
    
    console.log('✅ PWA-related localStorage cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing localStorage:', error);
    return false;
  }
}

// Función para limpiar sessionStorage relacionado con PWA
function clearPWASessionStorage() {
  try {
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
    
    console.log('✅ PWA-related sessionStorage cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing sessionStorage:', error);
    return false;
  }
}

// Función principal para limpiar todo el cache de PWA
async function clearPWACache() {
  console.log('🧹 Starting PWA cache cleanup...');
  
  const results = {
    caches: await clearServiceWorkerCache(),
    serviceWorkers: await unregisterServiceWorkers(),
    localStorage: clearPWALocalStorage(),
    sessionStorage: clearPWASessionStorage()
  };
  
  const allSuccess = Object.values(results).every(result => result === true);
  
  if (allSuccess) {
    console.log('✅ PWA cache cleanup completed successfully');
    console.log('🔄 Reloading page in 2 seconds...');
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  } else {
    console.log('⚠️ PWA cache cleanup completed with some errors:', results);
  }
  
  return results;
}

// Función para verificar estado del Service Worker
async function checkServiceWorkerStatus() {
  if ('serviceWorker' in navigator) {
    try {
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
    } catch (error) {
      console.error('❌ Error checking service worker status:', error);
      return [];
    }
  } else {
    console.log('❌ Service Workers not supported');
    return [];
  }
}

// Función para verificar cache disponible
async function checkCacheStatus() {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      console.log('📋 Cache Status:');
      console.log('- Caches found:', cacheNames.length);
      
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        console.log(`  ${cacheName}: ${keys.length} items`);
      }
      
      return cacheNames;
    } catch (error) {
      console.error('❌ Error checking cache status:', error);
      return [];
    }
  } else {
    console.log('❌ Cache API not supported');
    return [];
  }
}

// Función para mostrar estado completo
async function showPWAStatus() {
  console.log('🔍 PWA Status Report');
  console.log('==================');
  
  await checkServiceWorkerStatus();
  console.log('');
  await checkCacheStatus();
  console.log('');
  
  console.log('📱 PWA Support:');
  console.log('- Service Workers:', 'serviceWorker' in navigator);
  console.log('- Cache API:', 'caches' in window);
  console.log('- Push API:', 'PushManager' in window);
  console.log('- Notification API:', 'Notification' in window);
}

// Exportar funciones para uso global
window.PWACacheUtils = {
  clearPWACache,
  clearServiceWorkerCache,
  unregisterServiceWorkers,
  clearPWALocalStorage,
  clearPWASessionStorage,
  checkServiceWorkerStatus,
  checkCacheStatus,
  showPWAStatus
};

// Auto-ejecutar si se llama directamente
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clearPWACache,
    clearServiceWorkerCache,
    unregisterServiceWorkers,
    clearPWALocalStorage,
    clearPWASessionStorage,
    checkServiceWorkerStatus,
    checkCacheStatus,
    showPWAStatus
  };
}

console.log('🚀 PWA Cache Utils loaded');
console.log('Available commands:');
console.log('- PWACacheUtils.clearPWACache()');
console.log('- PWACacheUtils.showPWAStatus()');
console.log('- PWACacheUtils.checkServiceWorkerStatus()');
console.log('- PWACacheUtils.checkCacheStatus()'); 