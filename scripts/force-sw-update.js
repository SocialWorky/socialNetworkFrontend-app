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
    caches.keys().then(function(names) {
      for (let name of names) {
        caches.delete(name);
      }
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

// Función para mostrar el estado del Service Worker
function showServiceWorkerStatus() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
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

function forceCompleteUpdate() {
  clearServiceWorkerCache();
  unregisterServiceWorkers();
  setTimeout(() => {
    reloadPage();
  }, 1000);
}

window.PWAUtils = {
  forceServiceWorkerUpdate,
  clearServiceWorkerCache,
  unregisterServiceWorkers,
  reloadPage,
  showServiceWorkerStatus,
  forceCompleteUpdate
};

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
