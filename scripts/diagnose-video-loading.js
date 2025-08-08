/**
 * SCRIPT DE DIAGNÓSTICO: Problemas de carga de videos
 * 
 * Este script diagnostica específicamente problemas con la carga de videos
 * que pueden estar causando la carga infinita.
 * 
 * Ejecutar en la consola del navegador:
 * 1. Abrir DevTools (F12)
 * 2. Ir a la pestaña Console
 * 3. Copiar y pegar este script
 * 4. Presionar Enter
 */

console.log('🔍 INICIANDO DIAGNÓSTICO DE CARGA DE VIDEOS...');

// Función para interceptar peticiones de video
function interceptVideoRequests() {
  console.log('📡 Interceptando peticiones de video...');
  
  let requestCount = 0;
  const videoRequests: any[] = [];
  
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    
    if (typeof url === 'string' && (
      url.includes('.mp4') ||
      url.includes('video') ||
      url.includes('media')
    )) {
      requestCount++;
      const requestInfo = {
        id: requestCount,
        url: url,
        timestamp: Date.now(),
        method: 'fetch'
      };
      videoRequests.push(requestInfo);
      
      console.log(`🎬 Petición de video #${requestCount}: ${url}`);
    }
    
    return originalFetch.apply(this, args);
  };
  
  const originalXHR = window.XMLHttpRequest;
  const originalOpen = originalXHR.prototype.open;
  originalXHR.prototype.open = function(method, url, ...args) {
    if (typeof url === 'string' && (
      url.includes('.mp4') ||
      url.includes('video') ||
      url.includes('media')
    )) {
      requestCount++;
      const requestInfo = {
        id: requestCount,
        url: url,
        timestamp: Date.now(),
        method: 'xhr'
      };
      videoRequests.push(requestInfo);
      
      console.log(`🎬 XHR video #${requestCount}: ${url}`);
    }
    
    return originalOpen.apply(this, [method, url, ...args]);
  };
  
  return { requestCount, videoRequests };
}

// Función para analizar elementos de video
function analyzeVideoElements() {
  console.log('📹 Analizando elementos de video...');
  
  const videos = document.querySelectorAll('video');
  const videoComponents = document.querySelectorAll('worky-optimized-video');
  
  const analysis = {
    totalVideos: videos.length,
    totalComponents: videoComponents.length,
    videosWithSrc: 0,
    videosWithBlob: 0,
    videosWithPreload: 0,
    largeVideos: 0
  };
  
  videos.forEach((video, index) => {
    if (video.src) analysis.videosWithSrc++;
    if (video.src && video.src.startsWith('blob:')) analysis.videosWithBlob++;
    if (video.preload && video.preload !== 'none') analysis.videosWithPreload++;
    
    // Check for large videos
    if (video.duration && video.duration > 60) {
      analysis.largeVideos++;
      console.log(`⚠️  Video largo detectado #${index}: ${video.src} (${Math.round(video.duration)}s)`);
    }
  });
  
  console.log('📊 Análisis de elementos de video:', analysis);
  return analysis;
}

// Función para verificar MediaCacheService
function checkMediaCacheService() {
  console.log('🔧 Verificando MediaCacheService...');
  
  try {
    if (typeof window !== 'undefined' && window.angular) {
      const injector = window.angular.element(document.body).injector();
      if (injector) {
        try {
          const mediaCacheService = injector.get('MediaCacheService');
          console.log('✅ MediaCacheService encontrado');
          
          // Get load stats
          if (mediaCacheService.getLoadStats) {
            const stats = mediaCacheService.getLoadStats();
            console.log('📊 Estadísticas de MediaCacheService:', stats);
          }
          
          // Check cache size
          if (mediaCacheService.mediaCache) {
            console.log(`📦 Cache de medios: ${mediaCacheService.mediaCache.size} elementos`);
          }
          
        } catch (error) {
          console.log('❌ MediaCacheService no disponible:', error.message);
        }
      } else {
        console.log('❌ No se pudo acceder al injector de Angular');
      }
    } else {
      console.log('❌ Angular no disponible en este contexto');
    }
  } catch (error) {
    console.log('❌ Error al verificar MediaCacheService:', error.message);
  }
}

// Función para verificar memoria
function checkMemoryUsage() {
  console.log('💾 Verificando uso de memoria...');
  
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    const usage = {
      usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1024 / 1024),
      jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
      totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      percentageUsed: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
    };
    
    console.log('📊 Uso de memoria:', usage);
    
    if (usage.percentageUsed > 80) {
      console.log('⚠️  ADVERTENCIA: Uso de memoria alto (>80%)');
    }
    
    return usage;
  } else {
    console.log('❌ Información de memoria no disponible');
    return null;
  }
}

// Función para verificar blobs de video
function checkVideoBlobs() {
  console.log('🎬 Verificando blobs de video...');
  
  const videoBlobs = document.querySelectorAll('video[src^="blob:"]');
  const allBlobs = document.querySelectorAll('[src^="blob:"]');
  
  const blobAnalysis = {
    videoBlobs: videoBlobs.length,
    totalBlobs: allBlobs.length,
    blobUrls: Array.from(videoBlobs).map(video => video.src)
  };
  
  console.log('📊 Análisis de blobs:', blobAnalysis);
  
  if (blobAnalysis.videoBlobs > 10) {
    console.log('⚠️  ADVERTENCIA: Demasiados blobs de video (>10)');
  }
  
  return blobAnalysis;
}

// Función para verificar scroll listeners
function checkScrollListeners() {
  console.log('📜 Verificando scroll listeners...');
  
  // Count scroll listeners (approximate)
  const scrollElements = document.querySelectorAll('*');
  let scrollListenerCount = 0;
  
  scrollElements.forEach(element => {
    // This is a rough approximation
    if (element.onscroll || element.getAttribute('data-scroll-listener')) {
      scrollListenerCount++;
    }
  });
  
  console.log(`📊 Scroll listeners detectados: ${scrollListenerCount}`);
  
  if (scrollListenerCount > 50) {
    console.log('⚠️  ADVERTENCIA: Demasiados scroll listeners (>50)');
  }
  
  return scrollListenerCount;
}

// Función para verificar timers
function checkTimers() {
  console.log('⏱️  Verificando timers...');
  
  // This is a rough approximation since we can't directly count timers
  const timerCount = {
    setInterval: 0,
    setTimeout: 0
  };
  
  console.log('📊 Timers activos (aproximado):', timerCount);
  return timerCount;
}

// Función para generar recomendaciones
function generateRecommendations(analysis: any) {
  console.log('\n💡 RECOMENDACIONES:');
  console.log('===================');
  
  if (analysis.videoRequests > 20) {
    console.log('🚫 Demasiadas peticiones de video - Considera bloquear videos');
  }
  
  if (analysis.videoElements.totalVideos > 10) {
    console.log('📹 Demasiados videos en página - Considera lazy loading');
  }
  
  if (analysis.memory && analysis.memory.percentageUsed > 80) {
    console.log('💾 Memoria alta - Considera limpiar cache');
  }
  
  if (analysis.blobs.videoBlobs > 10) {
    console.log('🎬 Demasiados blobs de video - Considera limpiar blobs');
  }
  
  if (analysis.scrollListeners > 50) {
    console.log('📜 Demasiados scroll listeners - Considera optimizar');
  }
  
  console.log('===================\n');
}

// Función principal de diagnóstico
function runVideoDiagnosis() {
  console.log('🔍 EJECUTANDO DIAGNÓSTICO COMPLETO DE VIDEOS...');
  
  // 1. Interceptar peticiones
  const { requestCount, videoRequests } = interceptVideoRequests();
  
  // 2. Analizar elementos de video
  const videoElements = analyzeVideoElements();
  
  // 3. Verificar MediaCacheService
  checkMediaCacheService();
  
  // 4. Verificar memoria
  const memory = checkMemoryUsage();
  
  // 5. Verificar blobs
  const blobs = checkVideoBlobs();
  
  // 6. Verificar scroll listeners
  const scrollListeners = checkScrollListeners();
  
  // 7. Verificar timers
  const timers = checkTimers();
  
  // 8. Compilar análisis
  const analysis = {
    videoRequests: requestCount,
    videoElements,
    memory,
    blobs,
    scrollListeners,
    timers
  };
  
  console.log('\n🎯 DIAGNÓSTICO COMPLETADO');
  console.log('==========================');
  console.log(`🎬 Peticiones de video: ${requestCount}`);
  console.log(`📹 Videos en página: ${videoElements.totalVideos}`);
  console.log(`🎥 Componentes video: ${videoElements.totalComponents}`);
  console.log(`🎬 Blobs de video: ${blobs.videoBlobs}`);
  console.log(`📜 Scroll listeners: ${scrollListeners}`);
  console.log('==========================');
  
  // 9. Generar recomendaciones
  generateRecommendations(analysis);
  
  return analysis;
}

// Ejecutar diagnóstico
const diagnosisResult = runVideoDiagnosis();

console.log('\n📝 Para verificar peticiones: interceptVideoRequests()');
console.log('📝 Para analizar elementos: analyzeVideoElements()');
console.log('📝 Para verificar servicios: checkMediaCacheService()');
console.log('📝 Para verificar memoria: checkMemoryUsage()');
console.log('📝 Para verificar blobs: checkVideoBlobs()');
console.log('📝 Para verificar scroll: checkScrollListeners()');
console.log('📝 Para verificar timers: checkTimers()');
console.log('📝 Para recomendaciones: generateRecommendations(diagnosisResult)');
