#!/usr/bin/env node

/**
 * Docker Build Script
 * Handles safe Docker build process
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Docker build process...');

try {
  // Check if we're in a Docker environment
  const isDocker = fs.existsSync('/.dockerenv');
  
  if (isDocker) {
    console.log('📦 Running in Docker environment');
  }

  // Run the build process
  console.log('🔨 Building application...');
  execSync('ng build --configuration=production', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });

  console.log('✅ Docker build completed successfully');
  process.exit(0);

} catch (error) {
  console.error('❌ Docker build failed:', error.message);
  process.exit(1);
}
