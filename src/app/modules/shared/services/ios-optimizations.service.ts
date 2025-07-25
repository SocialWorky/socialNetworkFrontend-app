import { Injectable } from '@angular/core';
import { LogService, LevelLogEnum } from './core-apis/log.service';

@Injectable({
  providedIn: 'root'
})
export class IOSOptimizationsService {
  private isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  constructor(private logService: LogService) {
    this.initializeIOSOptimizations();
  }

  private initializeIOSOptimizations(): void {
    if (!this.isIOS) return;

    this.setupIOSPerformanceOptimizations();
    this.setupIOSMemoryOptimizations();
    this.setupIOSNetworkOptimizations();
    
    this.logService.log(LevelLogEnum.INFO, 'IOSOptimizationsService', 'iOS optimizations initialized');
  }

  private setupIOSPerformanceOptimizations(): void {
    // Disable smooth scrolling on iOS for better performance
    (document.documentElement.style as any).webkitOverflowScrolling = 'auto';
    
    // Optimize animations
    const style = document.createElement('style');
    style.textContent = `
      @media screen and (-webkit-min-device-pixel-ratio: 0) {
        * {
          -webkit-transform: translateZ(0);
          transform: translateZ(0);
        }
      }
    `;
    document.head.appendChild(style);
  }

  private setupIOSMemoryOptimizations(): void {
    // Monitor memory usage on iOS
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        if (memory && memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8) {
          this.logService.log(LevelLogEnum.WARN, 'IOSOptimizationsService', 'High memory usage detected', {
            used: memory.usedJSHeapSize,
            limit: memory.jsHeapSizeLimit
          });
          
          // Trigger garbage collection if possible
          if (window.gc) {
            window.gc();
          }
        }
      }, 30000); // Check every 30 seconds
    }
  }

  private setupIOSNetworkOptimizations(): void {
    // Optimize network requests for iOS
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      connection.addEventListener('change', () => {
        this.logService.log(LevelLogEnum.INFO, 'IOSOptimizationsService', 'Network connection changed', {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt
        });
      });
    }
  }

  public getIOSConfig() {
    return {
      isIOS: this.isIOS,
      maxMemoryCacheSize: 20,
      maxCacheAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      networkTimeout: 15000, // 15 seconds
      cleanupInterval: 5 * 60 * 1000 // 5 minutes
    };
  }

  public isIOSDevice(): boolean {
    return this.isIOS;
  }

  public optimizeForLowMemory(): void {
    if (!this.isIOS) return;

    // Clear non-essential caches
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (cacheName.includes('image') || cacheName.includes('media')) {
            caches.delete(cacheName);
          }
        });
      });
    }

    this.logService.log(LevelLogEnum.INFO, 'IOSOptimizationsService', 'Low memory optimization triggered');
  }
} 