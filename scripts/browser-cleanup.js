
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

// Also clean databases with user IDs (pattern: DB_NAME_USERID)
async function clearAllDatabasesWithUserIds() {
  // Get all databases
  const allDatabases = await indexedDB.databases();
  
  for (const db of allDatabases) {
    const dbName = db.name;
    // Check if it's a Worky database (with or without user ID)
    if (dbName && (
      dbName.startsWith('MobileImageCacheDB') ||
      dbName.startsWith('WorkyMessagesDB') ||
      dbName.startsWith('WorkyPublicationsDB') ||
      dbName.startsWith('WorkyCacheDB') ||
      dbName.startsWith('WorkyImageCacheDB')
    )) {
      try {
        await indexedDB.deleteDatabase(dbName);
        console.log('✅ Limpiado:', dbName);
      } catch (error) {
        console.log('⚠️ Error al limpiar', dbName, ':', error.message);
      }
    }
  }
}

async function clearAllDatabases() {
  // First, clear databases with user IDs (new pattern)
  await clearAllDatabasesWithUserIds();
  
  // Then, clear legacy databases without user IDs (fallback)
  for (const dbName of databases) {
    try {
      await indexedDB.deleteDatabase(dbName);
      console.log('✅ Limpiado (legacy):', dbName);
    } catch (error) {
      console.log('⚠️ Error al limpiar (legacy)', dbName, ':', error.message);
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
