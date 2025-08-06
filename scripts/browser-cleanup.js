
// Script para limpiar IndexedDB en el navegador
// Ejecutar en la consola del navegador

console.log('🧹 Limpiando IndexedDB...');

const databases = [
  'MobileImageCacheDB',
  'WorkyMessagesDB', 
  'WorkyPublicationsDB',
  'WorkyCacheDB',
  'WorkyImageCacheDB'
];

async function clearAllDatabases() {
  for (const dbName of databases) {
    try {
      await indexedDB.deleteDatabase(dbName);
      console.log('✅ Limpiado:', dbName);
    } catch (error) {
      console.log('⚠️ Error al limpiar', dbName, ':', error.message);
    }
  }
  
  // Limpiar también el cache del Service Worker
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log('✅ Cache limpiado:', cacheName);
      }
    } catch (error) {
      console.log('⚠️ Error al limpiar cache:', error.message);
    }
  }
  
  console.log('🎉 Limpieza completada. Recarga la página.');
}

clearAllDatabases();
