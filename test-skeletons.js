#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🦴 Verificando sistema de skeletons...\n');

// Verificar archivos de skeleton
const skeletonFiles = [
  'src/app/modules/shared/components/skeleton/skeleton.component.ts',
  'src/app/modules/shared/components/skeleton/skeleton-wrapper.component.ts',
  'src/app/modules/shared/components/skeleton/skeleton-list.component.ts',
  'src/app/modules/shared/components/skeleton/text-skeleton.component.ts',
  'src/app/modules/shared/components/skeleton/avatar-skeleton.component.ts',
  'src/app/modules/shared/components/skeleton/image-skeleton.component.ts',
  'src/app/modules/shared/components/skeleton/button-skeleton.component.ts',
  'src/app/modules/shared/services/skeleton.service.ts'
];

let skeletonsFound = 0;
let totalSkeletons = 0;

skeletonFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    let fileSkeletons = 0;
    
    console.log(`📁 ${file}:`);
    
    // Verificar características específicas por archivo
    if (file.includes('skeleton.component.ts')) {
      if (content.includes('animate-pulse')) {
        console.log('  ✅ Animación pulse configurada');
        fileSkeletons++;
      }
      if (content.includes('bg-gray-200')) {
        console.log('  ✅ Colores Tailwind configurados');
        fileSkeletons++;
      }
      if (content.includes('publication') || content.includes('profile')) {
        console.log('  ✅ Tipos de skeleton disponibles');
        fileSkeletons++;
      }
    }
    
    if (file.includes('skeleton-wrapper.component.ts')) {
      if (content.includes('isLoading')) {
        console.log('  ✅ Estado de carga configurado');
        fileSkeletons++;
      }
      if (content.includes('loadingMessage')) {
        console.log('  ✅ Mensajes de carga configurados');
        fileSkeletons++;
      }
    }
    
    if (file.includes('skeleton.service.ts')) {
      if (content.includes('startLoading')) {
        console.log('  ✅ Servicio de skeleton configurado');
        fileSkeletons++;
      }
      if (content.includes('SkeletonConfig')) {
        console.log('  ✅ Configuraciones predefinidas');
        fileSkeletons++;
      }
    }
    
    if (file.includes('text-skeleton.component.ts')) {
      if (content.includes('worky-text-skeleton')) {
        console.log('  ✅ Skeleton de texto granular');
        fileSkeletons++;
      }
    }
    
         if (file.includes('avatar-skeleton.component.ts')) {
       if (content.includes('worky-avatar-skeleton')) {
         console.log('  ✅ Skeleton de avatar granular');
         fileSkeletons++;
       }
       if (!content.includes('svg') && !content.includes('path')) {
         console.log('  ✅ Sin texto/iconos en avatar skeleton');
         fileSkeletons++;
       }
     }
    
    if (file.includes('image-skeleton.component.ts')) {
      if (content.includes('worky-image-skeleton')) {
        console.log('  ✅ Skeleton de imagen granular');
        fileSkeletons++;
      }
    }
    
    if (file.includes('button-skeleton.component.ts')) {
      if (content.includes('worky-button-skeleton')) {
        console.log('  ✅ Skeleton de botón granular');
        fileSkeletons++;
      }
    }
    
    if (fileSkeletons === 0) {
      console.log('  ⚠️  No se encontraron características específicas');
    }
    
    skeletonsFound += fileSkeletons;
    totalSkeletons += 3; // Estimación de características por archivo
    
    console.log('');
  } else {
    console.log(`❌ ${file}: No encontrado`);
  }
});

// Verificar implementación en componentes
const componentFiles = [
  'src/app/modules/shared/modules/addPublication/addPublication.component.ts',
  'src/app/modules/shared/modules/publication-view/publication-view.component.ts'
];

console.log('🔧 Verificando implementación en componentes:');

componentFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    let componentSkeletons = 0;
    
    console.log(`📁 ${file}:`);
    
    if (content.includes('simulateProgressiveLoading')) {
      console.log('  ✅ Carga progresiva implementada');
      componentSkeletons++;
    }
    
    if (content.includes('setTimeout')) {
      console.log('  ✅ Retrasos de carga configurados');
      componentSkeletons++;
    }
    
    if (content.includes('Loading: boolean = true')) {
      console.log('  ✅ Estados de carga individuales');
      componentSkeletons++;
    }
    
    if (content.includes('onAvatarLoad') || content.includes('onNameLoad')) {
      console.log('  ✅ Métodos de carga granular');
      componentSkeletons++;
    }
    
    if (componentSkeletons === 0) {
      console.log('  ⚠️  No se encontraron implementaciones de skeleton');
    }
    
    skeletonsFound += componentSkeletons;
    totalSkeletons += 4; // Estimación de características por componente
    
    console.log('');
  }
});

// Verificar configuración de Tailwind
const tailwindConfig = 'tailwind.config.js';
if (fs.existsSync(tailwindConfig)) {
  const content = fs.readFileSync(tailwindConfig, 'utf8');
  console.log('🎨 Verificando configuración de Tailwind:');
  
  if (content.includes('animate-pulse')) {
    console.log('  ✅ Animación pulse disponible');
    skeletonsFound++;
  }
  
  if (content.includes('bg-gray-200')) {
    console.log('  ✅ Colores skeleton disponibles');
    skeletonsFound++;
  }
  
  console.log('');
}

// Resumen
console.log('📈 RESUMEN DE SKELETONS:');
console.log(`✅ Características encontradas: ${skeletonsFound}`);
console.log(`📊 Porcentaje de implementación: ${Math.round((skeletonsFound / totalSkeletons) * 100)}%`);

if (skeletonsFound >= 20) {
  console.log('\n🎉 ¡Excelente! El sistema de skeletons está bien implementado.');
  console.log('💡 Para probar los skeletons:');
  console.log('   1. Abrir la aplicación en Chrome DevTools');
  console.log('   2. Ir a Network tab');
  console.log('   3. Configurar throttling a "Slow 3G"');
  console.log('   4. Recargar la página');
  console.log('   5. Observar la carga progresiva de elementos');
} else if (skeletonsFound >= 15) {
  console.log('\n👍 Buen progreso. Algunos skeletons implementados.');
  console.log('💡 Considerar:');
  console.log('   1. Completar implementación en componentes faltantes');
  console.log('   2. Ajustar tiempos de carga progresiva');
  console.log('   3. Verificar que los skeletons se muestren correctamente');
} else {
  console.log('\n⚠️  Necesita más trabajo en los skeletons.');
  console.log('💡 Priorizar:');
  console.log('   1. Implementar skeletons en componentes principales');
  console.log('   2. Configurar carga progresiva con retrasos');
  console.log('   3. Verificar que los estados de carga funcionen');
}

console.log('\n🚀 Para probar los skeletons:');
console.log('   npm run build:prod');
console.log('   npm run preview:prod');
console.log('   # Luego probar en Chrome DevTools con throttling 3G');
console.log('   # Los skeletons deberían aparecer por ~800ms antes del contenido real');

console.log('\n📋 Tiempos de carga progresiva configurados:');
console.log('   - Elementos básicos: 100-400ms');
console.log('   - Contenido: 500ms');
console.log('   - Avatar: 600ms');
console.log('   - Media: 700ms');
console.log('   - Avatar (addPublication): 800ms'); 