import { Injectable } from '@angular/core';
import { LogService, LevelLogEnum } from './core-apis/log.service';
import { ConnectionQualityService } from './connection-quality.service';
import { DeviceDetectionService } from './device-detection.service';
import { AuthService } from '../../auth/services/auth.service';

export interface EnhancedLogMetadata {
  // Device Information
  deviceInfo: {
    isMobile: boolean;
    isTablet: boolean;
    isNative: boolean;
    isIOS: boolean;
    isIphone: boolean;
    width: number;
    height: number;
    screenWidth: number;
    screenHeight: number;
    viewportWidth: number;
    viewportHeight: number;
    pixelRatio: number;
    colorDepth: number;
    orientation: string;
    userAgent: string;
    platform: string;
    language: string;
    onLine: boolean;
    cookieEnabled: boolean;
    hardwareConcurrency: number;
    deviceMemory?: number;
    maxTouchPoints: number;
  };
  
  // Connection Information
  connectionInfo: {
    quality: 'slow' | 'medium' | 'fast';
    effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
    downlink: number;
    rtt: number;
    saveData: boolean;
  };
  
  // User Information
  userInfo: {
    userId: string;
    userEmail: string;
    userRole: string;
    isAuthenticated: boolean;
  };
  
  // Performance Information
  performanceInfo: {
    loadTime?: number;
    memoryUsage?: number;
    memoryLimit?: number;
    timestamp: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class EnhancedLoggingService {
  private isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  constructor(
    private logService: LogService,
    private connectionQualityService: ConnectionQualityService,
    private deviceDetectionService: DeviceDetectionService,
    private authService: AuthService
  ) {}

  /**
   * Log with enhanced metadata including device, connection, and user information
   */
  logWithEnhancedMetadata(
    level: LevelLogEnum,
    context: string,
    message: string,
    additionalMetadata?: Record<string, any>
  ): void {
    try {
      const enhancedMetadata = this.getEnhancedMetadata();
      
      const finalMetadata = {
        ...enhancedMetadata,
        ...additionalMetadata
      };

      this.logService.log(level, context, message, finalMetadata);
    } catch (error) {
      // Fallback: log básico sin metadata mejorada
      console.error('Error in enhanced logging, falling back to basic log:', {
        context,
        message,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Intentar log básico
      try {
        this.logService.log(level, context, message, {
          error: 'Enhanced metadata failed',
          originalError: error instanceof Error ? error.message : 'Unknown error'
        });
      } catch (fallbackError) {
        console.error('Even basic logging failed:', fallbackError);
      }
    }
  }

  /**
   * Log image loading errors with comprehensive context
   */
  logImageError(
    context: string,
    message: string,
    imageUrl: string,
    imageType: string,
    error: any,
    loadTime?: number,
    additionalOptions?: Record<string, any>
  ): void {
    const metadata = this.getEnhancedMetadata();
    
    const imageErrorMetadata = {
      ...metadata,
      imageUrl,
      imageType,
      error: error?.message || error?.toString() || 'Unknown error',
      errorType: error?.constructor?.name || 'Error',
      loadTime: loadTime ? Math.round(loadTime) : undefined,
      ...additionalOptions
    };

    this.logService.log(LevelLogEnum.ERROR, context, message, imageErrorMetadata);
  }

  /**
   * Log performance issues with detailed context
   */
  logPerformanceIssue(
    context: string,
    message: string,
    performanceData: {
      loadTime?: number;
      memoryUsage?: number;
      cacheSize?: number;
      retryCount?: number;
    },
    additionalMetadata?: Record<string, any>
  ): void {
    const metadata = this.getEnhancedMetadata();
    
    const performanceMetadata = {
      ...metadata,
      performanceData,
      ...additionalMetadata
    };

    this.logService.log(LevelLogEnum.WARN, context, message, performanceMetadata);
  }

  /**
   * Log connection quality changes
   */
  logConnectionChange(
    context: string,
    message: string,
    previousQuality: string,
    currentQuality: string,
    additionalMetadata?: Record<string, any>
  ): void {
    const metadata = this.getEnhancedMetadata();
    
    const connectionMetadata = {
      ...metadata,
      previousQuality,
      currentQuality,
      ...additionalMetadata
    };

    this.logService.log(LevelLogEnum.INFO, context, message, connectionMetadata);
  }

  /**
   * Get comprehensive enhanced metadata
   */
  private getEnhancedMetadata(): EnhancedLogMetadata {
    try {
      const connectionInfo = this.connectionQualityService.getConnectionInfo();
      const userInfo = this.authService.getDecodedToken();
      
      return {
        deviceInfo: this.getDeviceInfo(),
        connectionInfo: {
          quality: connectionInfo.quality,
          effectiveType: connectionInfo.effectiveType,
          downlink: connectionInfo.downlink,
          rtt: connectionInfo.rtt,
          saveData: connectionInfo.saveData
        },
        userInfo: {
          userId: userInfo?.id || 'anonymous',
          userEmail: userInfo?.email || 'anonymous',
          userRole: userInfo?.role || 'user',
          isAuthenticated: !!userInfo
        },
        performanceInfo: {
          memoryUsage: this.getMemoryUsage(),
          memoryLimit: this.getMemoryLimit(),
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      // Fallback metadata en caso de error
      return {
        deviceInfo: {
          isMobile: false,
          isTablet: false,
          isNative: false,
          isIOS: false,
          isIphone: false,
          width: 0,
          height: 0,
          screenWidth: 0,
          screenHeight: 0,
          viewportWidth: 0,
          viewportHeight: 0,
          pixelRatio: 1,
          colorDepth: 24,
          orientation: 'unknown',
          userAgent: 'unknown',
          platform: 'unknown',
          language: 'unknown',
          onLine: navigator.onLine,
          cookieEnabled: navigator.cookieEnabled,
          hardwareConcurrency: navigator.hardwareConcurrency || 0,
          maxTouchPoints: navigator.maxTouchPoints
        },
        connectionInfo: {
          quality: 'fast',
          effectiveType: '4g',
          downlink: 10,
          rtt: 50,
          saveData: false
        },
        userInfo: {
          userId: 'anonymous',
          userEmail: 'anonymous',
          userRole: 'user',
          isAuthenticated: false
        },
        performanceInfo: {
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Get detailed device information
   */
  private getDeviceInfo(): EnhancedLogMetadata['deviceInfo'] {
    try {
      const isTablet = this.deviceDetectionService.isTablet();
      const isNative = this.deviceDetectionService.isNative();
      const isIphone = this.deviceDetectionService.isIphone();
      
      return {
        isMobile: this.deviceDetectionService.isMobile(),
        isTablet,
        isNative,
        isIOS: this.isIOS,
        isIphone,
        width: this.deviceDetectionService.width(),
        height: this.deviceDetectionService.height(),
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        pixelRatio: window.devicePixelRatio,
        colorDepth: window.screen.colorDepth,
        orientation: window.screen.orientation?.type || 'unknown',
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        onLine: navigator.onLine,
        cookieEnabled: navigator.cookieEnabled,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: (navigator as any).deviceMemory,
        maxTouchPoints: navigator.maxTouchPoints
      };
    } catch (error) {
      // Fallback device info en caso de error
      return {
        isMobile: false,
        isTablet: false,
        isNative: false,
        isIOS: false,
        isIphone: false,
        width: 0,
        height: 0,
        screenWidth: 0,
        screenHeight: 0,
        viewportWidth: 0,
        viewportHeight: 0,
        pixelRatio: 1,
        colorDepth: 24,
        orientation: 'unknown',
        userAgent: 'unknown',
        platform: 'unknown',
        language: 'unknown',
        onLine: navigator.onLine,
        cookieEnabled: navigator.cookieEnabled,
        hardwareConcurrency: navigator.hardwareConcurrency || 0,
        maxTouchPoints: navigator.maxTouchPoints
      };
    }
  }

  /**
   * Get memory usage information
   */
  private getMemoryUsage(): number | undefined {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory?.usedJSHeapSize;
    }
    return undefined;
  }

  /**
   * Get memory limit information
   */
  private getMemoryLimit(): number | undefined {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory?.jsHeapSizeLimit;
    }
    return undefined;
  }

  /**
   * Get connection quality recommendations
   */
  getConnectionRecommendations(): {
    timeout: number;
    maxRetries: number;
    retryDelay: number;
    compression: boolean;
    quality: 'low' | 'medium' | 'high';
  } {
    const connectionInfo = this.connectionQualityService.getConnectionInfo();
    
    switch (connectionInfo.quality) {
      case 'slow':
        return {
          timeout: 60000, // 60 seconds
          maxRetries: 3,
          retryDelay: 5000,
          compression: true,
          quality: 'low'
        };
      case 'medium':
        return {
          timeout: 45000, // 45 seconds
          maxRetries: 2,
          retryDelay: 3000,
          compression: true,
          quality: 'medium'
        };
      case 'fast':
      default:
        return {
          timeout: 30000, // 30 seconds
          maxRetries: 1,
          retryDelay: 1000,
          compression: false,
          quality: 'high'
        };
    }
  }

  /**
   * Check if current connection is suitable for image loading
   */
  isConnectionSuitableForImages(): boolean {
    const connectionInfo = this.connectionQualityService.getConnectionInfo();
    
    // For very slow connections, suggest not loading images
    if (connectionInfo.quality === 'slow' && connectionInfo.downlink < 0.5) {
      return false;
    }
    
    return true;
  }

  /**
   * Get optimized image loading strategy based on connection
   */
  getImageLoadingStrategy(): {
    useCache: boolean;
    preloadImages: boolean;
    compressImages: boolean;
    lazyLoad: boolean;
    progressiveLoading: boolean;
  } {
    const connectionInfo = this.connectionQualityService.getConnectionInfo();
    
    switch (connectionInfo.quality) {
      case 'slow':
        return {
          useCache: true,
          preloadImages: false,
          compressImages: true,
          lazyLoad: true,
          progressiveLoading: true
        };
      case 'medium':
        return {
          useCache: true,
          preloadImages: true,
          compressImages: true,
          lazyLoad: true,
          progressiveLoading: false
        };
      case 'fast':
      default:
        return {
          useCache: true,
          preloadImages: true,
          compressImages: false,
          lazyLoad: false,
          progressiveLoading: false
        };
    }
  }
} 