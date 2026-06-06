/**
 * SCRIPT DE EMERGENCIA: Bloquear videos y prevenir carga infinita de mp4
 * 
 * Este script bloquea específicamente la carga de videos mp4 que están causando
 * la carga infinita y memory leaks.
 * 
 * Ejecutar en la consola del navegador:
 * 1. Abrir DevTools (F12)
 * 2. Ir a la pestaña Console
 * 3. Copiar y pegar este script
 * 4. Presionar Enter
 */

console.log('🚨 INICIANDO BLOQUEO DE EMERGENCIA PARA VIDEOS...');

// Función para bloquear peticiones de video
function emergencyBlockVideoRequests() {
  console.log('🎬 Bloqueando peticiones de video...');
  
  const originalFetch = window.fetch;
  const originalXHR = window.XMLHttpRequest;
  let blockedCount = 0;
  
  // Bloquear fetch
  window.fetch = function(...args) {
    const url = args[0];
    
    if (typeof url === 'string' && (
      url.includes('.mp4') ||
      url.includes('video') ||
      url.includes('media') ||
      url.includes('blob:') ||
      url.includes('worky%7C_')
    )) {
      blockedCount++;
      console.log(`🚫 Video bloqueado #${blockedCount}: ${url}`);
      
      // Retornar error para detener la carga
      return Promise.reject(new Error('Video request blocked by emergency script'));
    }
    
    return originalFetch.apply(this, args);
  };
  
  // Bloquear XMLHttpRequest
  const originalOpen = originalXHR.prototype.open;
  originalXHR.prototype.open = function(method, url, ...args) {
    if (typeof url === 'string' && (
      url.includes('.mp4') ||
      url.includes('video') ||
      url.includes('media') ||
      url.includes('blob:') ||
      url.includes('worky%7C_')
    )) {
      blockedCount++;
      console.log(`🚫 XHR video bloqueado #${blockedCount}: ${url}`);
      
      // Simular error para detener la carga
      this.onerror(new Error('XHR video request blocked by emergency script'));
      return;
    }
    
    return originalOpen.apply(this, [method, url, ...args]);
  };
  
  console.log('✅ Bloqueo de videos activado');
  return blockedCount;
}

// Función para bloquear elementos de video
function emergencyBlockVideoElements() {
  console.log('📹 Bloqueando elementos de video...');
  
  let blockedCount = 0;
  
  // Bloquear creación de elementos video
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    if (tagName.toLowerCase() === 'video') {
      blockedCount++;
      console.log(`🚫 Elemento video bloqueado #${blockedCount}`);
      
      // Crear un div en lugar de video
      const div = originalCreateElement.call(this, 'div');
      div.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Video bloqueado por emergencia</div>';
      return div;
    }
    
    return originalCreateElement.call(this, tagName);
  };
  
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
  
  console.log(`✅ Bloqueo de elementos video activado. ${blockedCount} videos bloqueados`);
  return blockedCount;
}

// Función para bloquear MediaCacheService
function emergencyBlockMediaCacheService() {
  console.log('🔧 Bloqueando MediaCacheService...');
  
  try {
    if (typeof window !== 'undefined' && window.angular) {
      const injector = window.angular.element(document.body).injector();
      if (injector) {
        // Bloquear MediaCacheService
        try {
          const mediaCacheService = injector.get('MediaCacheService');
          console.log('✅ MediaCacheService encontrado');
          
          // Limpiar cache de medios
          if (mediaCacheService.mediaCache) {
            const beforeSize = mediaCacheService.mediaCache.size;
            mediaCacheService.mediaCache.clear();
            console.log(`🧹 Cache de medios limpiado: ${beforeSize} -> 0 elementos`);
          }
          
          // Forzar limpieza
          if (mediaCacheService.forceCleanup) {
            mediaCacheService.forceCleanup();
            console.log('✅ Limpieza forzada de MediaCacheService');
          }
          
          // Bloquear método loadMedia
          const originalLoadMedia = mediaCacheService.loadMedia;
          mediaCacheService.loadMedia = function(url, options) {
            console.log(`🚫 MediaCacheService.loadMedia bloqueado: ${url}`);
            return Promise.reject(new Error('MediaCacheService blocked by emergency script'));
          };
          
        } catch (error) {
          console.log('❌ MediaCacheService no disponible');
        }
        
      } else {
        console.log('❌ No se pudo acceder al injector de Angular');
      }
    } else {
      console.log('❌ Angular no disponible en este contexto');
    }
  } catch (error) {
    console.log('❌ Error al bloquear MediaCacheService:', error.message);
  }
}

// Función para bloquear OptimizedVideoComponent
function emergencyBlockVideoComponents() {
  console.log('🎥 Bloqueando componentes de video...');
  
  let blockedCount = 0;
  
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
  
  console.log(`✅ Bloqueo de componentes video activado. ${blockedCount} componentes bloqueados`);
  return blockedCount;
}

// Función para limpiar blobs de video
function emergencyCleanupVideoBlobs() {
  console.log('🧹 Limpiando blobs de video...');
  
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
  
  console.log(`✅ Limpieza de blobs de video completada. ${cleanedCount} blobs limpiados`);
  return cleanedCount;
}

// Función para bloquear preload de videos
function emergencyBlockVideoPreload() {
  console.log('⏭️  Bloqueando preload de videos...');
  
  let blockedCount = 0;
  
  // Bloquear atributo preload en videos
  const videos = document.querySelectorAll('video');
  videos.forEach((video, index) => {
    if (video.preload !== 'none') {
      blockedCount++;
      console.log(`🚫 Preload bloqueado #${blockedCount}: ${video.src}`);
      video.preload = 'none';
    }
  });
  
  // Bloquear creación de videos con preload
  const originalSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value) {
    if (name === 'preload' && this.tagName.toLowerCase() === 'video') {
      blockedCount++;
      console.log(`🚫 Preload bloqueado #${blockedCount}: ${this.src}`);
      value = 'none';
    }
    return originalSetAttribute.call(this, name, value);
  };
  
  console.log(`✅ Bloqueo de preload activado. ${blockedCount} preloads bloqueados`);
  return blockedCount;
}

// Función para mostrar estadísticas de video
function showVideoStats() {
  console.log('\n📊 ESTADÍSTICAS DE VIDEO:');
  console.log('==========================');
  
  // Contar videos en la página
  const videos = document.querySelectorAll('video');
  console.log(`📹 Videos en página: ${videos.length}`);
  
  // Contar componentes de video
  const videoComponents = document.querySelectorAll('worky-optimized-video');
  console.log(`🎥 Componentes video: ${videoComponents.length}`);
  
  // Contar blobs de video
  const videoBlobs = document.querySelectorAll('video[src^="blob:"]');
  console.log(`🎬 Blobs de video: ${videoBlobs.length}`);
  
  // Mostrar información de memoria
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    console.log(`💾 Memoria usada: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`);
    console.log(`💾 Porcentaje usado: ${Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)}%`);
  }
  
  console.log('==========================\n');
}

// Función principal de bloqueo de videos
function runEmergencyVideoBlock() {
  console.log('🚨 EJECUTANDO BLOQUEO DE EMERGENCIA PARA VIDEOS...');
  
  // 1. Bloquear peticiones de video
  const blockedRequests = emergencyBlockVideoRequests();
  
  // 2. Bloquear elementos de video
  const blockedElements = emergencyBlockVideoElements();
  
  // 3. Bloquear MediaCacheService
  emergencyBlockMediaCacheService();
  
  // 4. Bloquear componentes de video
  const blockedComponents = emergencyBlockVideoComponents();
  
  // 5. Limpiar blobs de video
  const cleanedBlobs = emergencyCleanupVideoBlobs();
  
  // 6. Bloquear preload de videos
  const blockedPreloads = emergencyBlockVideoPreload();
  
  // 7. Mostrar estadísticas
  showVideoStats();
  
  console.log('\n🎯 BLOQUEO DE VIDEOS COMPLETADO');
  console.log('================================');
  console.log(`🚫 Peticiones bloqueadas: ${blockedRequests}`);
  console.log(`📹 Elementos bloqueados: ${blockedElements}`);
  console.log(`🎥 Componentes bloqueados: ${blockedComponents}`);
  console.log(`🧹 Blobs limpiados: ${cleanedBlobs}`);
  console.log(`⏭️  Preloads bloqueados: ${blockedPreloads}`);
  console.log('================================');
  
  console.log('\n💡 RECOMENDACIONES:');
  console.log('1. 🔄 Recarga la página para aplicar cambios permanentes');
  console.log('2. 📱 Reinicia la aplicación si es necesario');
  console.log('3. 🎬 Los videos estarán bloqueados hasta que se solucione el problema');
  console.log('4. 📊 Monitorea el rendimiento en DevTools');
  
  return {
    blockedRequests,
    blockedElements,
    blockedComponents,
    cleanedBlobs,
    blockedPreloads
  };
}

// Ejecutar bloqueo de videos
const videoBlockResult = runEmergencyVideoBlock();

console.log('\n📝 Para verificar el estado: showVideoStats()');
console.log('📝 Para bloquear peticiones: emergencyBlockVideoRequests()');
console.log('📝 Para bloquear elementos: emergencyBlockVideoElements()');
console.log('📝 Para bloquear servicios: emergencyBlockMediaCacheService()');
console.log('📝 Para bloquear componentes: emergencyBlockVideoComponents()');
console.log('📝 Para limpiar blobs: emergencyCleanupVideoBlobs()');
console.log('📝 Para bloquear preload: emergencyBlockVideoPreload()');
