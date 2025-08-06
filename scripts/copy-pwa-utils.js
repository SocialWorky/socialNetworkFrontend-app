/**
 * Script para copiar utilidades PWA a la carpeta de assets
 * Esto permite que las utilidades estén disponibles en producción
 */

const fs = require('fs');
const path = require('path');

// Función para copiar archivo
function copyFile(source, destination) {
  try {
    const sourcePath = path.join(__dirname, source);
    const destPath = path.join(__dirname, '..', 'src', 'assets', destination);
    
    // Verificar que el archivo fuente existe
    if (!fs.existsSync(sourcePath)) {
      console.warn(`⚠️ Source file not found: ${sourcePath}`);
      return false;
    }
    
    // Crear directorio si no existe
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    // Copiar archivo
    fs.copyFileSync(sourcePath, destPath);
    console.log(`✅ Copied: ${source} -> ${destination}`);
    return true;
  } catch (error) {
    console.error(`❌ Error copying ${source}:`, error.message);
    return false;
  }
}

// Función principal
function copyPWAUtils() {
  console.log('📁 Copying PWA utilities to assets...');
  
  const filesToCopy = [
    { source: 'clear-pwa-cache.js', destination: 'js/clear-pwa-cache.js' },
    { source: 'force-sw-update.js', destination: 'js/force-sw-update.js' }
  ];
  
  let successCount = 0;
  
  filesToCopy.forEach(file => {
    if (copyFile(file.source, file.destination)) {
      successCount++;
    }
  });
  
  console.log(`\n📊 Copy completed: ${successCount}/${filesToCopy.length} files copied successfully`);
  
  if (successCount === filesToCopy.length) {
    console.log('🎉 All PWA utilities copied successfully!');
  } else {
    console.log('⚠️ Some files failed to copy');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  copyPWAUtils();
}

module.exports = { copyPWAUtils, copyFile }; 