const fs = require('fs');
const path = require('path');

const cacheDir = path.join(__dirname, '../.angular/cache');
const distDir = path.join(__dirname, '../dist');

console.log('🧹 Clearing development cache...');

if (fs.existsSync(cacheDir)) {
  fs.rmSync(cacheDir, { recursive: true, force: true });
  console.log('✅ Angular cache cleared');
}

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
  console.log('✅ Dist folder cleared');
}

console.log('🎉 Cache cleared successfully!'); 