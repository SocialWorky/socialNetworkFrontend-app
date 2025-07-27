/**
 * Script específico para builds de Docker
 * Maneja mejor los errores y es más robusto en entornos containerizados
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Función para verificar si estamos en un entorno Docker
function isDockerEnvironment() {
  return fs.existsSync('/.dockerenv') || 
         fs.existsSync('/proc/1/cgroup') && 
         fs.readFileSync('/proc/1/cgroup', 'utf8').includes('docker');
}

// Función para copiar utilidades PWA de forma segura
function copyPWAUtilsSafely() {
  console.log('📁 Copying PWA utilities for Docker build...');
  
  const filesToCopy = [
    { source: 'clear-pwa-cache.js', destination: 'js/clear-pwa-cache.js' },
    { source: 'force-sw-update.js', destination: 'js/force-sw-update.js' }
  ];
  
  let successCount = 0;
  
  filesToCopy.forEach(file => {
    try {
      const sourcePath = path.join(__dirname, file.source);
      const destPath = path.join(__dirname, '..', 'src', 'assets', file.destination);
      
      // Verificar que el archivo fuente existe
      if (!fs.existsSync(sourcePath)) {
        console.warn(`⚠️ Source file not found: ${sourcePath} - skipping`);
        return;
      }
      
      // Crear directorio si no existe
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      // Copiar archivo
      fs.copyFileSync(sourcePath, destPath);
      console.log(`✅ Copied: ${file.source} -> ${file.destination}`);
      successCount++;
    } catch (error) {
      console.warn(`⚠️ Error copying ${file.source}: ${error.message} - continuing...`);
    }
  });
  
  console.log(`📊 PWA utilities copy completed: ${successCount}/${filesToCopy.length} files copied`);
  return successCount > 0;
}

// Función para ejecutar build de Angular
function runAngularBuild() {
  try {
    console.log('🔨 Running Angular build...');
    
    // Usar el comando de build estándar de Angular
    execSync('ng build --configuration=production', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    console.log('✅ Angular build completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Angular build failed:', error.message);
    return false;
  }
}

// Función principal
function dockerBuild() {
  console.log('🐳 Starting Docker build process...');
  console.log(`Environment: ${isDockerEnvironment() ? 'Docker' : 'Local'}`);
  
  // Copiar utilidades PWA de forma segura
  const utilsCopied = copyPWAUtilsSafely();
  
  if (!utilsCopied) {
    console.warn('⚠️ PWA utilities could not be copied - continuing with build...');
  }
  
  // Ejecutar build de Angular
  const buildSuccess = runAngularBuild();
  
  if (buildSuccess) {
    console.log('🎉 Docker build process completed successfully');
    process.exit(0);
  } else {
    console.error('💥 Docker build process failed');
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  dockerBuild();
}

module.exports = { 
  dockerBuild, 
  copyPWAUtilsSafely, 
  runAngularBuild, 
  isDockerEnvironment 
}; 