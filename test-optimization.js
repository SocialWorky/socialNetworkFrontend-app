#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando optimizaciones implementadas...\n');

// Verificar archivos optimizados
const filesToCheck = [
  'tailwind.config.js',
  'angular.json',
  'src/styles.css',
  'nginx.conf',
  'ngsw-config.json',
  'src/app/modules/shared/services/core-apis/lazy-css.service.ts',
  'src/app/modules/shared/services/core-apis/font-loader.service.ts'
];

let optimizationsFound = 0;
let totalOptimizations = 0;

filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    let fileOptimizations = 0;
    
    console.log(`📁 ${file}:`);
    
    // Verificar optimizaciones específicas por archivo
    if (file.includes('tailwind.config.js')) {
      if (content.includes('purge') || content.includes('safelist')) {
        console.log('  ✅ Purga de Tailwind configurada');
        fileOptimizations++;
      }
      if (content.includes('corePlugins')) {
        console.log('  ✅ Plugins innecesarios deshabilitados');
        fileOptimizations++;
      }
    }
    
    if (file.includes('angular.json')) {
      if (content.includes('"maximumWarning": "1.5mb"')) {
        console.log('  ✅ Budgets optimizados');
        fileOptimizations++;
      }
      if (content.includes('assets/emoji-mart/')) {
        console.log('  ✅ Assets de terceros configurados');
        fileOptimizations++;
      }
    }
    
    if (file.includes('styles.css')) {
      if (content.includes('/* Carga lazy de highlight.js')) {
        console.log('  ✅ CSS crítico optimizado');
        fileOptimizations++;
      }
      if (content.includes('--highlight-bg')) {
        console.log('  ✅ Variables CSS críticas');
        fileOptimizations++;
      }
    }
    
    if (file.includes('nginx.conf')) {
      if (content.includes('gzip_comp_level 9')) {
        console.log('  ✅ Compresión agresiva configurada');
        fileOptimizations++;
      }
      if (content.includes('expires 1y')) {
        console.log('  ✅ Caché optimizado');
        fileOptimizations++;
      }
    }
    
    if (file.includes('ngsw-config.json')) {
      if (content.includes('"installMode": "lazy"')) {
        console.log('  ✅ Service Worker optimizado');
        fileOptimizations++;
      }
      if (content.includes('assets-third-party')) {
        console.log('  ✅ Caché de terceros configurado');
        fileOptimizations++;
      }
    }
    
    if (file.includes('lazy-css.service.ts')) {
      if (content.includes('loadHighlightJs')) {
        console.log('  ✅ Servicio de carga lazy CSS');
        fileOptimizations++;
      }
      if (content.includes('loadEmojiMartCss')) {
        console.log('  ✅ Carga lazy de emoji-mart');
        fileOptimizations++;
      }
    }
    
    if (file.includes('font-loader.service.ts')) {
      if (content.includes('loadMaterialIcons')) {
        console.log('  ✅ Servicio de carga lazy de fuentes');
        fileOptimizations++;
      }
      if (content.includes('loadGoogleFont')) {
        console.log('  ✅ Carga lazy de Google Fonts');
        fileOptimizations++;
      }
    }
    
    if (fileOptimizations === 0) {
      console.log('  ⚠️  No se encontraron optimizaciones específicas');
    }
    
    optimizationsFound += fileOptimizations;
    totalOptimizations += 5; // Estimación de optimizaciones por archivo
    
    console.log('');
  } else {
    console.log(`❌ ${file}: No encontrado`);
  }
});

// Verificar tamaño del CSS
const wwwDir = 'www';
if (fs.existsSync(wwwDir)) {
  const cssFiles = fs.readdirSync(wwwDir).filter(file => file.endsWith('.css'));
  if (cssFiles.length > 0) {
    const cssFile = cssFiles[0];
    const stats = fs.statSync(path.join(wwwDir, cssFile));
    const sizeKB = Math.round(stats.size / 1024);
    console.log(`📊 Tamaño del CSS generado: ${sizeKB}KB`);
    
    if (sizeKB < 100) {
      console.log('  ✅ CSS optimizado (menos de 100KB)');
      optimizationsFound++;
    } else {
      console.log('  ⚠️  CSS aún puede optimizarse más');
    }
  }
}

// Resumen
console.log('\n📈 RESUMEN DE OPTIMIZACIONES:');
console.log(`✅ Optimizaciones encontradas: ${optimizationsFound}`);
console.log(`📊 Porcentaje de implementación: ${Math.round((optimizationsFound / totalOptimizations) * 100)}%`);

if (optimizationsFound >= 15) {
  console.log('\n🎉 ¡Excelente! Las optimizaciones están bien implementadas.');
  console.log('💡 Próximos pasos:');
  console.log('   1. Probar en conexiones lentas reales');
  console.log('   2. Monitorear métricas de rendimiento');
  console.log('   3. Implementar en componentes específicos');
} else if (optimizationsFound >= 10) {
  console.log('\n👍 Buen progreso. Algunas optimizaciones implementadas.');
  console.log('💡 Considerar:');
  console.log('   1. Completar implementación en componentes');
  console.log('   2. Optimizar más el CSS');
  console.log('   3. Configurar métricas de monitoreo');
} else {
  console.log('\n⚠️  Necesita más trabajo en las optimizaciones.');
  console.log('💡 Priorizar:');
  console.log('   1. Corregir errores de compilación');
  console.log('   2. Implementar servicios de carga lazy');
  console.log('   3. Optimizar configuración de build');
}

console.log('\n🚀 Para probar las optimizaciones:');
console.log('   npm run build:prod');
console.log('   npm run preview:prod');
console.log('   # Luego probar en Chrome DevTools con throttling 3G'); 