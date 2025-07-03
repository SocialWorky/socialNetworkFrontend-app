/**
 * Script para forzar la actualización del Service Worker
 * Útil durante el desarrollo para probar las actualizaciones
 */

// Función para forzar la actualización del Service Worker
function forceServiceWorkerUpdate() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        registration.update();
        console.log('Service Worker actualización forzada');
      }
    });
  }
}

// Función para limpiar el cache del Service Worker
function clearServiceWorkerCache() {
  if ('caches' in window) {
    caches.keys().then(function(names) {
      for (let name of names) {
        caches.delete(name);
        console.log('Cache eliminado:', name);
      }
    });
  }
}

// Función para desregistrar todos los Service Workers
function unregisterServiceWorkers() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        registration.unregister();
        console.log('Service Worker desregistrado');
      }
    });
  }
}

// Función para recargar la página
function reloadPage() {
  window.location.reload();
}

// Función para mostrar el estado del Service Worker
function showServiceWorkerStatus() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      console.log('Service Workers registrados:', registrations.length);
      registrations.forEach((registration, index) => {
        console.log(`SW ${index + 1}:`, {
          scope: registration.scope,
          active: !!registration.active,
          waiting: !!registration.waiting,
          installing: !!registration.installing
        });
      });
    });
  }
}

// Función para forzar una actualización completa
function forceCompleteUpdate() {
  console.log('Iniciando actualización completa...');
  
  // 1. Limpiar cache
  clearServiceWorkerCache();
  
  // 2. Desregistrar Service Workers
  unregisterServiceWorkers();
  
  // 3. Recargar página después de un breve delay
  setTimeout(() => {
    reloadPage();
  }, 1000);
}

// Exportar funciones para uso global
window.PWAUtils = {
  forceServiceWorkerUpdate,
  clearServiceWorkerCache,
  unregisterServiceWorkers,
  reloadPage,
  showServiceWorkerStatus,
  forceCompleteUpdate
};

// Auto-ejecutar en desarrollo
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log('PWA Utils cargado. Usa PWAUtils.forceCompleteUpdate() para forzar actualización');
}

module.exports = {
  forceServiceWorkerUpdate,
  clearServiceWorkerCache,
  unregisterServiceWorkers,
  reloadPage,
  showServiceWorkerStatus,
  forceCompleteUpdate
}; 