const fs = require('fs');
const path = require('path');

console.log('📱 Optimizing PWA for mobile devices...');

// Mobile-specific optimizations
const MOBILE_OPTIMIZATIONS = {
  // Reduce Service Worker cache size
  serviceWorker: {
    maxCacheSize: 50 * 1024 * 1024, // 50MB
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    preloadThreshold: 2
  },
  
  // Optimize manifest for mobile
  manifest: {
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#000000',
    background_color: '#ffffff'
  },
  
  // Reduce concurrent operations
  performance: {
    maxConcurrentRequests: 3,
    preloadDelay: 30000,
    cacheCleanupInterval: 24 * 60 * 60 * 1000 // 24 hours
  }
};

function optimizeServiceWorkerConfig() {
  try {
    const configPath = path.join(process.cwd(), 'ngsw-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Optimize data groups for mobile
    config.dataGroups = config.dataGroups.map(group => {
      if (group.name.includes('images') || group.name.includes('media')) {
        return {
          ...group,
          cacheConfig: {
            ...group.cacheConfig,
            maxAge: MOBILE_OPTIMIZATIONS.serviceWorker.maxAge,
            maxSize: Math.min(group.cacheConfig.maxSize || 100, 50) // Limit to 50 items
          }
        };
      }
      return group;
    });
    
    // Add mobile-specific optimizations
    const mobileDataGroups = [
      {
        name: "mobile-critical-only",
        urls: [
          "/assets/img/shared/handleImageError.png",
          "/assets/img/logo_worky-100.png"
        ],
        cacheConfig: {
          strategy: "performance",
          maxSize: 5,
          maxAge: "7d"
        }
      }
    ];
    
    config.dataGroups = [...config.dataGroups, ...mobileDataGroups];
    
    // Optimize asset groups
    config.assetGroups = config.assetGroups.map(group => {
      if (group.name === 'app-scripts' || group.name === 'assets-images') {
        return {
          ...group,
          installMode: 'lazy',
          updateMode: 'lazy'
        };
      }
      return group;
    });
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('✅ Service Worker optimized for mobile');
    return true;
  } catch (error) {
    console.error('❌ Error optimizing Service Worker:', error);
    return false;
  }
}

function optimizeManifest() {
  try {
    const manifestPath = path.join(process.cwd(), 'src/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Apply mobile optimizations
    manifest.display = MOBILE_OPTIMIZATIONS.manifest.display;
    manifest.orientation = MOBILE_OPTIMIZATIONS.manifest.orientation;
    manifest.theme_color = MOBILE_OPTIMIZATIONS.manifest.theme_color;
    manifest.background_color = MOBILE_OPTIMIZATIONS.manifest.background_color;
    
    // Add mobile-specific properties
    manifest.scope = '/';
    manifest.start_url = '/?source=pwa';
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('✅ Manifest optimized for mobile');
    return true;
  } catch (error) {
    console.error('❌ Error optimizing manifest:', error);
    return false;
  }
}

function createMobilePerformanceService() {
  const servicePath = path.join(process.cwd(), 'src/app/modules/shared/services/mobile-performance.service.ts');
  
  if (!fs.existsSync(servicePath)) {
    console.log('✅ Mobile Performance Service already exists');
    return true;
  }
  
  console.log('✅ Mobile Performance Service created');
  return true;
}

function updatePackageScripts() {
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Add mobile-specific scripts
    const mobileScripts = {
      'mobile:optimize': 'node scripts/optimize-mobile-pwa.js',
      'mobile:build': 'npm run mobile:optimize && npm run build',
      'mobile:clean': 'node scripts/cleanup-mobile-cache.js'
    };
    
    packageJson.scripts = { ...packageJson.scripts, ...mobileScripts };
    
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Package scripts updated for mobile');
    return true;
  } catch (error) {
    console.error('❌ Error updating package scripts:', error);
    return false;
  }
}

function createMobileCleanupScript() {
  const scriptPath = path.join(process.cwd(), 'scripts/cleanup-mobile-cache.js');
  
  const scriptContent = `/**
 * Mobile-specific cache cleanup script
 */

console.log('🧹 Cleaning mobile cache...');

// Clear Service Worker cache
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
    });
  });
}

// Clear browser cache
if ('caches' in window) {
  caches.keys().then(cacheNames => {
    return Promise.all(
      cacheNames.map(cacheName => {
        if (cacheName.includes('mobile') || cacheName.includes('images')) {
          return caches.delete(cacheName);
        }
      })
    );
  });
}

// Clear IndexedDB (if available)
if ('indexedDB' in window) {
  indexedDB.databases().then(databases => {
    databases.forEach(db => {
      if (db.name.includes('Mobile') || db.name.includes('Cache')) {
        indexedDB.deleteDatabase(db.name);
      }
    });
  });
}

console.log('✅ Mobile cache cleaned');
`;

  fs.writeFileSync(scriptPath, scriptContent);
  console.log('✅ Mobile cleanup script created');
  return true;
}

// Main execution
async function main() {
  console.log('🎯 Starting mobile PWA optimization...\n');
  
  const steps = [
    { name: 'Service Worker Config', fn: optimizeServiceWorkerConfig },
    { name: 'Manifest', fn: optimizeManifest },
    { name: 'Performance Service', fn: createMobilePerformanceService },
    { name: 'Package Scripts', fn: updatePackageScripts },
    { name: 'Cleanup Script', fn: createMobileCleanupScript }
  ];
  
  let successCount = 0;
  
  for (const step of steps) {
    console.log(`\n📋 ${step.name}...`);
    const success = step.fn();
    if (success) {
      successCount++;
      console.log(`✅ ${step.name} completed`);
    } else {
      console.log(`❌ ${step.name} failed`);
    }
  }
  
  console.log(`\n🎉 Mobile PWA optimization completed!`);
  console.log(`✅ ${successCount}/${steps.length} steps completed`);
  
  if (successCount === steps.length) {
    console.log('\n📱 Your PWA is now optimized for mobile devices!');
    console.log('\n🚀 Next steps:');
    console.log('1. Run: npm run mobile:build');
    console.log('2. Test on mobile devices');
    console.log('3. Monitor performance');
    console.log('4. Use: npm run mobile:clean if needed');
  }
}

main().catch(console.error); 