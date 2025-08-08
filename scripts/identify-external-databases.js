/**
 * Script para identificar bases de datos externas y verificar las nuestras
 * 
 * Este script analiza todas las bases de datos IndexedDB para identificar
 * cuáles son de nuestra aplicación y cuáles son externas.
 * 
 * Ejecutar en la consola del navegador:
 * 1. Abrir DevTools (F12)
 * 2. Ir a la pestaña Console
 * 3. Copiar y pegar este script
 * 4. Presionar Enter
 */

console.log('🔍 Iniciando análisis de bases de datos IndexedDB...');

// Función para categorizar bases de datos
function categorizeDatabases(databases) {
  const categories = {
    worky: [],
    external: [],
    unknown: []
  };
  
  databases.forEach(db => {
    const name = db.name;
    
    // Categorizar bases de datos Worky
    if (name.startsWith('Worky') || name.startsWith('MobileImageCacheDB')) {
      categories.worky.push(db);
    }
    // Categorizar bases de datos conocidas externas
    else if (name.startsWith('LogsDatabaseV2') || 
             name.startsWith('YtldbMeta') ||
             name.startsWith('ytdl') ||
             name.startsWith('ytdlp') ||
             name.startsWith('chrome-extension') ||
             name.startsWith('moz-extension') ||
             name.startsWith('firefox-extension') ||
             name.includes('extension') ||
             name.includes('plugin') ||
             name.includes('addon')) {
      categories.external.push(db);
    }
    // Otras bases de datos desconocidas
    else {
      categories.unknown.push(db);
    }
  });
  
  return categories;
}

// Función para analizar bases de datos Worky
function analyzeWorkyDatabases(workyDatabases) {
  console.log('\n📊 ANÁLISIS DE BASES DE DATOS WORKY:');
  console.log(`  Total encontradas: ${workyDatabases.length}`);
  
  if (workyDatabases.length === 0) {
    console.log('  ⚠️  No se encontraron bases de datos Worky');
    console.log('  🔧 Esto puede indicar que:');
    console.log('     - No se ha hecho login aún');
    console.log('     - Las bases de datos no se están creando correctamente');
    console.log('     - Hay un problema con la inicialización');
    return;
  }
  
  workyDatabases.forEach(db => {
    const hasUserId = db.name.includes('_');
    const status = hasUserId ? '✅ Con ID de usuario' : '❌ Sin ID de usuario';
    console.log(`    ${db.name}: ${status}`);
    
    if (!hasUserId) {
      console.log(`      ⚠️  Esta base de datos debería tener ID de usuario`);
    }
  });
}

// Función para analizar bases de datos externas
function analyzeExternalDatabases(externalDatabases) {
  console.log('\n🔌 ANÁLISIS DE BASES DE DATOS EXTERNAS:');
  console.log(`  Total encontradas: ${externalDatabases.length}`);
  
  if (externalDatabases.length === 0) {
    console.log('  ✅ No se encontraron bases de datos externas');
    return;
  }
  
  externalDatabases.forEach(db => {
    console.log(`    ${db.name}`);
    
    // Identificar posibles fuentes
    if (db.name.startsWith('LogsDatabaseV2')) {
      console.log('      📝 Posible fuente: Extensión de YouTube o similar');
    } else if (db.name.startsWith('YtldbMeta') || db.name.includes('ytdl')) {
      console.log('      🎥 Posible fuente: Extensión de descarga de videos (yt-dlp)');
    } else if (db.name.includes('extension')) {
      console.log('      🔌 Posible fuente: Extensión del navegador');
    } else {
      console.log('      ❓ Fuente desconocida');
    }
  });
}

// Función para analizar bases de datos desconocidas
function analyzeUnknownDatabases(unknownDatabases) {
  console.log('\n❓ ANÁLISIS DE BASES DE DATOS DESCONOCIDAS:');
  console.log(`  Total encontradas: ${unknownDatabases.length}`);
  
  if (unknownDatabases.length === 0) {
    console.log('  ✅ No se encontraron bases de datos desconocidas');
    return;
  }
  
  unknownDatabases.forEach(db => {
    console.log(`    ${db.name}`);
    console.log('      ❓ Fuente desconocida - podría ser:');
    console.log('         - Extensión del navegador');
    console.log('         - Servicio web externo');
    console.log('         - Aplicación web de terceros');
  });
}

// Función para verificar el estado del usuario
function checkUserState() {
  console.log('\n👤 VERIFICANDO ESTADO DEL USUARIO:');
  
  const token = localStorage.getItem('token');
  if (token && token !== 'undefined' && token !== 'null') {
    try {
      const decodedToken = JSON.parse(atob(token.split('.')[1]));
      console.log('✅ Usuario autenticado:', {
        userId: decodedToken.id,
        email: decodedToken.email,
        role: decodedToken.role
      });
      
      // Verificar qué bases de datos deberían existir
      const expectedDatabases = [
        `WorkyMessagesDB_${decodedToken.id}`,
        `WorkyPublicationsDB_${decodedToken.id}`,
        `MobileImageCacheDB_${decodedToken.id}`
      ];
      
      console.log('📋 Bases de datos esperadas para este usuario:');
      expectedDatabases.forEach(dbName => {
        console.log(`    ${dbName}`);
      });
      
      return {
        authenticated: true,
        userId: decodedToken.id,
        expectedDatabases
      };
    } catch (error) {
      console.log('❌ Error al decodificar token:', error.message);
      return { authenticated: false };
    }
  } else {
    console.log('⚠️  No hay usuario autenticado');
    console.log('💡 Esto explica por qué no hay bases de datos Worky');
    return { authenticated: false };
  }
}

// Función para verificar si las bases de datos esperadas existen
async function checkExpectedDatabases(expectedDatabases) {
  console.log('\n🔍 VERIFICANDO BASES DE DATOS ESPERADAS:');
  
  const allDatabases = await indexedDB.databases();
  
  expectedDatabases.forEach(expectedDb => {
    const exists = allDatabases.some(db => db.name === expectedDb);
    const status = exists ? '✅ Existe' : '❌ No existe';
    console.log(`    ${expectedDb}: ${status}`);
    
    if (!exists) {
      console.log(`      ⚠️  Esta base de datos debería existir para el usuario autenticado`);
    }
  });
  
  return expectedDatabases.map(expectedDb => {
    const exists = allDatabases.some(db => db.name === expectedDb);
    return { name: expectedDb, exists };
  });
}

// Función para generar recomendaciones
function generateRecommendations(userState, workyDatabases, expectedDatabases) {
  console.log('\n💡 RECOMENDACIONES:');
  
  if (!userState.authenticated) {
    console.log('  1. 🔐 Hacer login para crear las bases de datos Worky');
    console.log('  2. 🔄 Recargar la página después del login');
    console.log('  3. 🧪 Ejecutar scripts/test-mobile-image-cache-init.js para verificar');
  } else {
    const missingDatabases = expectedDatabases.filter(db => !db.exists);
    
    if (missingDatabases.length > 0) {
      console.log('  1. 🔄 Recargar la página para forzar la inicialización');
      console.log('  2. 🧪 Ejecutar scripts/test-mobile-image-cache-init.js para diagnosticar');
      console.log('  3. 🔍 Verificar logs de DatabaseManagerService en la consola');
      console.log('  4. 🚪 Hacer logout y login nuevamente');
    } else {
      console.log('  1. ✅ Todas las bases de datos Worky están creadas correctamente');
      console.log('  2. 🧹 Las bases de datos externas no afectan nuestra aplicación');
    }
  }
  
  if (workyDatabases.some(db => !db.name.includes('_'))) {
    console.log('  5. 🧹 Ejecutar scripts/migrate-indexeddb-user-ids.js para limpiar bases de datos antiguas');
  }
}

// Función principal
async function runDatabaseAnalysis() {
  console.log('🚀 Iniciando análisis completo de bases de datos...');
  
  try {
    // Obtener todas las bases de datos
    const allDatabases = await indexedDB.databases();
    console.log(`📊 Total de bases de datos encontradas: ${allDatabases.length}`);
    
    // Categorizar bases de datos
    const categories = categorizeDatabases(allDatabases);
    
    // Analizar cada categoría
    analyzeWorkyDatabases(categories.worky);
    analyzeExternalDatabases(categories.external);
    analyzeUnknownDatabases(categories.unknown);
    
    // Verificar estado del usuario
    const userState = checkUserState();
    
    // Verificar bases de datos esperadas si hay usuario autenticado
    let expectedDatabases = [];
    if (userState.authenticated) {
      expectedDatabases = await checkExpectedDatabases(userState.expectedDatabases);
    }
    
    // Generar recomendaciones
    generateRecommendations(userState, categories.worky, expectedDatabases);
    
    // Resumen final
    console.log('\n📋 RESUMEN:');
    console.log(`  Bases de datos Worky: ${categories.worky.length}`);
    console.log(`  Bases de datos externas: ${categories.external.length}`);
    console.log(`  Bases de datos desconocidas: ${categories.unknown.length}`);
    console.log(`  Usuario autenticado: ${userState.authenticated ? 'SÍ' : 'NO'}`);
    
    if (userState.authenticated) {
      const missingCount = expectedDatabases.filter(db => !db.exists).length;
      console.log(`  Bases de datos faltantes: ${missingCount}`);
    }
    
    return {
      total: allDatabases.length,
      worky: categories.worky.length,
      external: categories.external.length,
      unknown: categories.unknown.length,
      userAuthenticated: userState.authenticated,
      missingDatabases: userState.authenticated ? expectedDatabases.filter(db => !db.exists).length : 0
    };
    
  } catch (error) {
    console.error('❌ Error durante el análisis:', error);
    return null;
  }
}

// Ejecutar el análisis
runDatabaseAnalysis().catch(error => {
  console.error('❌ Error durante el análisis:', error);
});

console.log('📝 Para ejecutar solo la categorización: categorizeDatabases(await indexedDB.databases())');
console.log('📝 Para ejecutar solo la verificación de usuario: checkUserState()');
console.log('📝 Para ejecutar solo la verificación de bases de datos esperadas: checkExpectedDatabases([...])');
