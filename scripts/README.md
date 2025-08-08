# Scripts Esenciales

Esta carpeta contiene los scripts esenciales para el mantenimiento y diagnóstico de la aplicación.

## 🚨 Scripts de Emergencia

### `emergency-stop-infinite-loading.js`
**Propósito**: Detener inmediatamente la carga infinita de imágenes y videos
- Bloquea peticiones de imágenes y videos
- Limpia todos los blobs activos
- Bloquea scroll listeners
- Limpia IndexedDB
- Forza garbage collection

**Uso**: Ejecutar en la consola del navegador cuando hay carga infinita

### `emergency-block-videos.js`
**Propósito**: Bloquear específicamente videos que causan problemas
- Bloquea peticiones de video (.mp4, video, media)
- Reemplaza elementos `<video>` con placeholders
- Bloquea componentes `worky-optimized-video`
- Limpia blobs de video
- Bloquea preload de videos

**Uso**: Ejecutar cuando solo hay problemas con videos

## 🔍 Scripts de Diagnóstico

### `diagnose-video-loading.js`
**Propósito**: Diagnosticar problemas específicos con la carga de videos
- Intercepta peticiones de video
- Analiza elementos de video en la página
- Verifica MediaCacheService
- Revisa uso de memoria
- Analiza blobs de video
- Verifica scroll listeners

**Uso**: Ejecutar para diagnosticar problemas de rendimiento con videos

### `identify-external-databases.js`
**Propósito**: Identificar bases de datos externas no relacionadas con la app
- Lista todas las bases de datos IndexedDB
- Categoriza como 'worky', 'external', o 'unknown'
- Proporciona análisis y recomendaciones

**Uso**: Ejecutar cuando aparecen bases de datos inesperadas

## 🧹 Scripts de Limpieza

### `browser-cleanup.js`
**Propósito**: Limpiar todas las bases de datos del navegador
- Elimina todas las bases de datos IndexedDB
- Limpia localStorage
- Limpia sessionStorage
- Limpia Service Worker cache

**Uso**: Ejecutar para limpiar completamente el navegador

### `clear-ios-cache.js`
**Propósito**: Limpiar cache específico para dispositivos iOS
- Limpia cache de imágenes
- Limpia cache de videos
- Limpia IndexedDB específico de iOS
- Optimiza para Safari iOS

**Uso**: Ejecutar en dispositivos iOS cuando hay problemas de cache

## 📋 Uso de los Scripts

### Para Problemas de Carga Infinita:
1. **Ejecutar**: `emergency-stop-infinite-loading.js`
2. **Recargar** la página
3. **Verificar** que el problema se resolvió

### Para Problemas Específicos de Videos:
1. **Ejecutar**: `emergency-block-videos.js`
2. **Recargar** la página
3. **Diagnosticar**: `diagnose-video-loading.js`

### Para Limpieza General:
1. **Ejecutar**: `browser-cleanup.js`
2. **Recargar** la página
3. **Verificar** que todo funciona correctamente

### Para Diagnóstico:
1. **Ejecutar**: `diagnose-video-loading.js`
2. **Revisar** las estadísticas mostradas
3. **Seguir** las recomendaciones

## ⚠️ Notas Importantes

- **Siempre recargar la página** después de ejecutar scripts de emergencia
- **Los scripts de emergencia son temporales** - recargar para aplicar cambios permanentes
- **Monitorear el rendimiento** en DevTools después de usar los scripts
- **Los scripts de diagnóstico no modifican** el comportamiento de la aplicación

## 🔧 Scripts Eliminados

Los siguientes scripts fueron eliminados por ser redundantes o ya no necesarios:
- `diagnose-infinite-loading.js` (reemplazado por `diagnose-video-loading.js`)
- `optimize-image-cache.js` (optimizaciones implementadas en código)
- `test-*.js` (scripts de prueba ya no necesarios)
- `migrate-*.js` (migraciones ya completadas)
- `optimize-*.js` (optimizaciones implementadas en código)
- `clear-*.js` (reemplazados por scripts más específicos)
