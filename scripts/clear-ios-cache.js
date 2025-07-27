#!/usr/bin/env node

/**
 * Script para limpiar cache de iOS y resolver problemas de IndexedDB
 * Uso: node scripts/clear-ios-cache.js
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 Limpiando cache de iOS y IndexedDB...');

// Función para limpiar IndexedDB
function clearIndexedDB() {
  console.log('📱 Limpiando bases de datos IndexedDB...');
  
  const databases = [
    'MobileImageCacheDB',
    'WorkyMessagesDB', 
    'WorkyPublicationsDB',
    'WorkyCacheDB',
    'WorkyImageCacheDB'
  ];

  databases.forEach(dbName => {
    try {
      // En un entorno de Node.js, no podemos acceder directamente a IndexedDB
      // Pero podemos crear un script que se ejecute en el navegador
      console.log(`🗑️  Marcando para limpieza: ${dbName}`);
    } catch (error) {
      console.log(`⚠️  Error al limpiar ${dbName}:`, error.message);
    }
  });
}

// Función para limpiar cache del navegador
function clearBrowserCache() {
  console.log('🌐 Limpiando cache del navegador...');
  
  const cacheDirs = [
    path.join(process.cwd(), 'dist'),
    path.join(process.cwd(), '.angular'),
    path.join(process.cwd(), 'node_modules/.cache')
  ];

  cacheDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`✅ Limpiado: ${dir}`);
      } catch (error) {
        console.log(`⚠️  Error al limpiar ${dir}:`, error.message);
      }
    }
  });
}

// Función para limpiar cache de Capacitor
function clearCapacitorCache() {
  console.log('📱 Limpiando cache de Capacitor...');
  
  const capacitorDirs = [
    path.join(process.cwd(), 'ios/App/build'),
    path.join(process.cwd(), 'android/app/build'),
    path.join(process.cwd(), 'www')
  ];

  capacitorDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`✅ Limpiado: ${dir}`);
      } catch (error) {
        console.log(`⚠️  Error al limpiar ${dir}:`, error.message);
      }
    }
  });
}

// Función para generar script de limpieza del navegador
function generateBrowserCleanupScript() {
  const script = `
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
`;

  const scriptPath = path.join(process.cwd(), 'scripts/browser-cleanup.js');
  fs.writeFileSync(scriptPath, script);
  console.log('📝 Script de limpieza del navegador generado: scripts/browser-cleanup.js');
  console.log('💡 Ejecuta el contenido de ese archivo en la consola del navegador');
}

// Función principal
function main() {
  console.log('🚀 Iniciando limpieza completa...\n');
  
  clearIndexedDB();
  clearBrowserCache();
  clearCapacitorCache();
  generateBrowserCleanupScript();
  
  console.log('\n✅ Limpieza completada!');
  console.log('\n📋 Próximos pasos:');
  console.log('1. Ejecuta el contenido de scripts/browser-cleanup.js en la consola del navegador');
  console.log('2. Recarga la aplicación');
  console.log('3. Si usas Capacitor, ejecuta: npx cap sync');
  console.log('4. Para desarrollo: npm run start');
  console.log('5. Para producción: npm run build');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { main, clearIndexedDB, clearBrowserCache, clearCapacitorCache }; 