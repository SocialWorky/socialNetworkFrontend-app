/**
 * SCRIPT DE EMERGENCIA: Detener carga infinita inmediatamente
 * 
 * Este script detiene inmediatamente la carga infinita y limpia todos los recursos
 * para restaurar el rendimiento normal de la aplicación.
 * 
 * Ejecutar en la consola del navegador:
 * 1. Abrir DevTools (F12)
 * 2. Ir a la pestaña Console
 * 3. Copiar y pegar este script
 * 4. Presionar Enter
 */

console.log('🚨 INICIANDO SCRIPT DE EMERGENCIA PARA DETENER CARGA INFINITA...');

// Función para limpiar todos los blobs activos
function emergencyCleanupBlobs() {
  console.log('🧹 Limpiando todos los blobs activos...');
  
  let cleanedCount = 0;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  
  // Interceptar revokeObjectURL para contar
  URL.revokeObjectURL = function(url) {
    if (url.startsWith('blob:http://localhost:4200/')) {
      cleanedCount++;
    }
    return originalRevokeObjectURL.apply(this, arguments);
  };
  
  // Forzar limpieza de memoria
  if (window.gc) {
    window.gc();
  }
  
  console.log(`✅ Limpieza de emergencia completada. ${cleanedCount} blobs limpiados`);
  return cleanedCount;
}

// Función para bloquear peticiones de imágenes y videos
function emergencyBlockImageRequests() {
  console.log('🚫 Bloqueando peticiones de imágenes y videos...');
  
  const originalFetch = window.fetch;
  const originalXHR = window.XMLHttpRequest;
  let blockedCount = 0;
  
  // Bloquear fetch
  window.fetch = function(...args) {
    const url = args[0];
    
    if (typeof url === 'string' && (
      url.includes('worky%7C_') || 
      url.includes('blob:') ||
      url.includes('image') ||
      url.includes('avatar') ||
      url.includes('profile') ||
      url.includes('.mp4') ||
      url.includes('video') ||
      url.includes('media')
    )) {
      blockedCount++;
      console.log(`🚫 Petición bloqueada #${blockedCount}: ${url}`);
      
      // Retornar error para detener la carga
      return Promise.reject(new Error('Media request blocked by emergency script'));
    }
    
    return originalFetch.apply(this, args);
  };
  
  // Bloquear XMLHttpRequest
  const originalOpen = originalXHR.prototype.open;
  originalXHR.prototype.open = function(method, url, ...args) {
    if (typeof url === 'string' && (
      url.includes('worky%7C_') || 
      url.includes('blob:') ||
      url.includes('image') ||
      url.includes('avatar') ||
      url.includes('profile') ||
      url.includes('.mp4') ||
      url.includes('video') ||
      url.includes('media')
    )) {
      blockedCount++;
      console.log(`🚫 XHR bloqueado #${blockedCount}: ${url}`);
      
      // Simular error para detener la carga
      this.onerror(new Error('XHR request blocked by emergency script'));
      return;
    }
    
    return originalOpen.apply(this, [method, url, ...args]);
  };
  
  console.log('✅ Bloqueo de peticiones de imágenes y videos activado');
  return blockedCount;
}

// Función para limpiar cache de servicios
function emergencyCleanupServices() {
  console.log('🔧 Limpiando servicios de cache...');
  
  try {
    if (typeof window !== 'undefined' && window.angular) {
      const injector = window.angular.element(document.body).injector();
      if (injector) {
        // Limpiar MobileImageCacheService
        try {
          const mobileImageCache = injector.get('MobileImageCacheService');
          console.log('✅ MobileImageCacheService encontrado');
          
          // Limpiar cache de memoria
          if (mobileImageCache.memoryCache) {
            const beforeSize = mobileImageCache.memoryCache.size;
            mobileImageCache.memoryCache.clear();
            console.log(`🧹 Cache de memoria limpiado: ${beforeSize} -> 0 elementos`);
          }
          
          // Limpiar cache persistente
          if (mobileImageCache.clearCache) {
            mobileImageCache.clearCache().then(() => {
              console.log('✅ Cache persistente limpiado');
            }).catch(error => {
              console.log('⚠️  Error al limpiar cache persistente:', error.message);
            });
          }
          
          // Forzar optimización
          if (mobileImageCache.forceOptimization) {
            mobileImageCache.forceOptimization().then(() => {
              console.log('✅ Optimización forzada completada');
            }).catch(error => {
              console.log('⚠️  Error en optimización forzada:', error.message);
            });
          }
          
        } catch (error) {
          console.log('❌ MobileImageCacheService no disponible');
        }
        
        // Limpiar ImageService
        try {
          const imageService = injector.get('ImageService');
          console.log('✅ ImageService encontrado');
          
          // Limpiar cache de imágenes
          if (imageService.imageCache) {
            const beforeSize = imageService.imageCache.size;
            imageService.imageCache.clear();
            console.log(`🧹 Cache de imágenes limpiado: ${beforeSize} -> 0 elementos`);
          }
          
        } catch (error) {
          console.log('❌ ImageService no disponible');
        }
        
        // Limpiar MediaCacheService
        try {
          const mediaCacheService = injector.get('MediaCacheService');
          console.log('✅ MediaCacheService encontrado');
          
          // Limpiar cache de medios
          if (mediaCacheService.mediaCache) {
            const beforeSize = mediaCacheService.mediaCache.size;
            mediaCacheService.mediaCache.clear();
            console.log(`🧹 Cache de medios limpiado: ${beforeSize} -> 0 elementos`);
          }
          
        } catch (error) {
          console.log('❌ MediaCacheService no disponible');
        }
        
        // Limpiar ScrollOptimizationService
        try {
          const scrollOptimizationService = injector.get('ScrollOptimizationService');
          console.log('✅ ScrollOptimizationService encontrado');
          
          // Forzar limpieza
          if (scrollOptimizationService.forceCleanup) {
            scrollOptimizationService.forceCleanup();
            console.log('✅ Limpieza de scroll forzada');
          }
          
        } catch (error) {
          console.log('❌ ScrollOptimizationService no disponible');
        }
        
      } else {
        console.log('❌ No se pudo acceder al injector de Angular');
      }
    } else {
      console.log('❌ Angular no disponible en este contexto');
    }
  } catch (error) {
    console.log('❌ Error al limpiar servicios:', error.message);
  }
}

// Función para bloquear scroll listeners
function emergencyBlockScrollListeners() {
  console.log('📜 Bloqueando scroll listeners...');
  
  let blockedCount = 0;
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  
  EventTarget.prototype.addEventListener = function(type, listener, ...args) {
    if (type === 'scroll') {
      blockedCount++;
      console.log(`🚫 Scroll listener bloqueado #${blockedCount}`);
      
      // Reemplazar con listener vacío
      const emptyListener = function(event) {
        // No hacer nada
      };
      
      return originalAddEventListener.apply(this, [type, emptyListener, ...args]);
    }
    
    return originalAddEventListener.apply(this, [type, listener, ...args]);
  };
  
  console.log(`✅ Bloqueo de scroll listeners activado. ${blockedCount} listeners bloqueados`);
  return blockedCount;
}

// Función para bloquear elementos de video
function emergencyBlockVideoElements() {
  console.log('📹 Bloqueando elementos de video...');
  
  let blockedCount = 0;
  
  // Bloquear elementos video existentes
  const existingVideos = document.querySelectorAll('video');
  existingVideos.forEach((video, index) => {
    blockedCount++;
    console.log(`🚫 Video existente bloqueado #${blockedCount}: ${video.src}`);
    
    // Reemplazar con placeholder
    const placeholder = document.createElement('div');
    placeholder.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Video bloqueado por emergencia</div>';
    placeholder.style.cssText = video.style.cssText;
    video.parentNode?.replaceChild(placeholder, video);
  });
  
  // Bloquear componentes worky-optimized-video
  const videoComponents = document.querySelectorAll('worky-optimized-video');
  videoComponents.forEach((component, index) => {
    blockedCount++;
    console.log(`🚫 Componente video bloqueado #${blockedCount}`);
    
    // Reemplazar con placeholder
    const placeholder = document.createElement('div');
    placeholder.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Video bloqueado por emergencia</div>';
    placeholder.style.cssText = component.style.cssText;
    component.parentNode?.replaceChild(placeholder, component);
  });
  
  console.log(`✅ Bloqueo de elementos video activado. ${blockedCount} videos bloqueados`);
  return blockedCount;
}

// Función para bloquear setInterval y setTimeout
function emergencyBlockTimers() {
  console.log('⏱️  Bloqueando timers...');
  
  let blockedCount = 0;
  const originalSetInterval = window.setInterval;
  const originalSetTimeout = window.setTimeout;
  
  window.setInterval = function(fn, delay, ...args) {
    blockedCount++;
    console.log(`🚫 setInterval bloqueado #${blockedCount}: ${delay}ms`);
    
    // Retornar un ID falso
    return 999999;
  };
  
  window.setTimeout = function(fn, delay, ...args) {
    // Solo bloquear timeouts cortos que podrían ser de carga
    if (delay < 1000) {
      blockedCount++;
      console.log(`🚫 setTimeout bloqueado #${blockedCount}: ${delay}ms`);
      
      // Retornar un ID falso
      return 999999;
    }
    
    return originalSetTimeout.apply(this, [fn, delay, ...args]);
  };
  
  console.log(`✅ Bloqueo de timers activado. ${blockedCount} timers bloqueados`);
  return blockedCount;
}

// Función para limpiar IndexedDB
function emergencyCleanupIndexedDB() {
  console.log('🗄️  Limpiando IndexedDB...');
  
  const databasesToDelete = [
    'MobileImageCacheDB',
    'WorkyMessagesDB',
    'WorkyPublicationsDB'
  ];
  
  let deletedCount = 0;
  
  databasesToDelete.forEach(dbName => {
    try {
      indexedDB.deleteDatabase(dbName);
      console.log(`🗑️  Base de datos eliminada: ${dbName}`);
      deletedCount++;
    } catch (error) {
      console.log(`⚠️  Error al eliminar ${dbName}:`, error.message);
    }
  });
  
  console.log(`✅ Limpieza de IndexedDB completada. ${deletedCount} bases de datos eliminadas`);
  return deletedCount;
}

// Función para forzar garbage collection
function emergencyForceGC() {
  console.log('🗑️  Forzando garbage collection...');
  
  if (window.gc) {
    window.gc();
    console.log('✅ Garbage collection forzado');
  } else {
    console.log('⚠️  Garbage collection no disponible');
  }
}

// Función para mostrar estadísticas
function showEmergencyStats() {
  console.log('\n📊 ESTADÍSTICAS DE EMERGENCIA:');
  console.log('================================');
  
  // Mostrar información de memoria
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    console.log(`💾 Memoria usada: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`);
    console.log(`💾 Límite de memoria: ${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)}MB`);
    console.log(`💾 Porcentaje usado: ${Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)}%`);
  }
  
  // Mostrar información de blobs
  console.log(`🖼️  Blobs activos: ${document.querySelectorAll('img[src^="blob:"]').length}`);
  
  // Mostrar información de peticiones
  console.log(`🌐 Peticiones activas: ${performance.getEntriesByType('resource').length}`);
  
  console.log('================================\n');
}

// Función principal de emergencia
function runEmergencyStop() {
  console.log('🚨 EJECUTANDO SCRIPT DE EMERGENCIA...');
  
  // 1. Limpiar blobs
  const cleanedBlobs = emergencyCleanupBlobs();
  
  // 2. Bloquear peticiones de imágenes
  const blockedRequests = emergencyBlockImageRequests();
  
  // 3. Limpiar servicios
  emergencyCleanupServices();
  
  // 4. Bloquear scroll listeners
  const blockedScrollListeners = emergencyBlockScrollListeners();
  
  // 5. Bloquear elementos de video
  const blockedVideos = emergencyBlockVideoElements();
  
  // 6. Bloquear timers
  const blockedTimers = emergencyBlockTimers();
  
  // 7. Limpiar IndexedDB
  const deletedDatabases = emergencyCleanupIndexedDB();
  
  // 8. Forzar garbage collection
  emergencyForceGC();
  
  // 9. Mostrar estadísticas
  showEmergencyStats();
  
  console.log('\n🎯 SCRIPT DE EMERGENCIA COMPLETADO');
  console.log('====================================');
  console.log(`🧹 Blobs limpiados: ${cleanedBlobs}`);
  console.log(`🚫 Peticiones bloqueadas: ${blockedRequests}`);
  console.log(`📜 Scroll listeners bloqueados: ${blockedScrollListeners}`);
  console.log(`📹 Videos bloqueados: ${blockedVideos}`);
  console.log(`⏱️  Timers bloqueados: ${blockedTimers}`);
  console.log(`🗄️  Bases de datos eliminadas: ${deletedDatabases}`);
  console.log('====================================');
  
  console.log('\n💡 RECOMENDACIONES:');
  console.log('1. 🔄 Recarga la página para aplicar cambios permanentes');
  console.log('2. 📱 Reinicia la aplicación si es necesario');
  console.log('3. 🧹 Ejecuta el script de optimización después de recargar');
  console.log('4. 📊 Monitorea el rendimiento en DevTools');
  
  return {
    cleanedBlobs,
    blockedRequests,
    blockedScrollListeners,
    blockedVideos,
    blockedTimers,
    deletedDatabases
  };
}

// Ejecutar script de emergencia
const emergencyResult = runEmergencyStop();

console.log('\n📝 Para verificar el estado: showEmergencyStats()');
console.log('📝 Para forzar GC: emergencyForceGC()');
console.log('📝 Para limpiar blobs: emergencyCleanupBlobs()');
console.log('📝 Para bloquear peticiones: emergencyBlockImageRequests()');
console.log('📝 Para limpiar servicios: emergencyCleanupServices()');
console.log('📝 Para bloquear scroll: emergencyBlockScrollListeners()');
console.log('📝 Para bloquear videos: emergencyBlockVideoElements()');
console.log('📝 Para bloquear timers: emergencyBlockTimers()');
console.log('📝 Para limpiar IndexedDB: emergencyCleanupIndexedDB()');
