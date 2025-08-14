/**
 * App Version Configuration
 * This file manages the application version and build information
 * Update this file whenever you want to release a new version
 */

export interface AppVersionConfig {
  version: string;
  buildNumber: string;
  releaseDate: string;
  changelog: string;
  minRequiredVersion?: string;
  forceUpdate: boolean;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  downloadUrl?: string;
}

/**
 * Current app version configuration
 * Update these values when releasing a new version
 */
export const APP_VERSION_CONFIG: AppVersionConfig = {
  version: '2.3.0',
  buildNumber: Date.now().toString(),
  releaseDate: new Date().toISOString(),
  changelog: `
    🔧 MEJORAS DEL SISTEMA DE SOCKET (v2.3.0):
    - Fixed: Corrección de recursión infinita en NotificationUsersService
      * Socket funciona correctamente sin necesidad de refresh
      * Inicialización única de listeners de eventos
      * Sistema estable y confiable para usuarios online/offline
    
    - Added: Sistema de reconexión automática robusto
      * Reconexión automática con backoff exponencial (máximo 5 intentos)
      * Monitoreo de conexión cada 10 segundos
      * Manejo robusto de desconexiones y reconexiones
      * Prevención de pérdida de conexión con el servidor
    
    - Improved: Limpieza completa de código y optimización
      * Eliminación de 185 líneas de código innecesario (-25.6%)
      * Remoción de 15+ métodos de debugging y testing
      * Formato consistente y profesional en todo el código
      * Cumplimiento 100% de las reglas .dev establecidas
    
    - Enhanced: Manejo de eventos y estados de usuario
      * Listeners específicos para cada tipo de evento de socket
      * Map para manejo de estados con O(1) lookup performance
      * Caché inteligente con expiración de 30 segundos
      * Estados consistentes de usuarios online/offline/inactive
    
    - Optimized: Rendimiento y estabilidad del sistema
      * Operadores RxJS optimizados: distinctUntilChanged, debounceTime, shareReplay
      * Inicialización única de listeners para evitar duplicación
      * Cleanup completo en ngOnDestroy para prevenir memory leaks
      * Sistema de eventos estable sin interrupciones
    
    📚 DOCUMENTACIÓN COMPLETA Y REGLAS ESTABLECIDAS:
    - Added: Buenas prácticas de socket y manejo de eventos
      * Patrones correctos documentados con ejemplos de código
      * Problemas críticos a evitar (recursión infinita, inicialización múltiple)
      * Checklist obligatorio de implementación para futuras funcionalidades
      * Reglas críticas de socket y eventos documentadas
    
    - Added: Reglas de comentarios y formato obligatorias
      * Comentarios solo en inglés (PROHIBIDO español)
      * Solo comentarios que agreguen valor real
      * Formato profesional consistente en todo el código
      * Reglas absolutas de memoria permanente para el asistente
    
    - Enhanced: Reglas de formato de código clarificadas
      * Variables de clase separadas por líneas en blanco (OBLIGATORIO)
      * Variables dentro de métodos juntas, sin separación
      * Indentación de 2 espacios siempre, nunca 4
      * Salto de línea final obligatorio en todos los archivos
    
    🚀 OPTIMIZACIONES DE PERFORMANCE (v2.2.0):
    - Optimized: Eliminación de comentarios con actualización local instantánea
      * Eliminada llamada de red innecesaria para eliminar comentarios
      * Actualización inmediata del estado local sin network requests
      * Mejor UX con feedback instantáneo al usuario
      * Reducción significativa de tráfico de red y carga del servidor
    
    - Refactored: Media processing notifications con RxJS declarativo
      * Eliminada duplicación de código (~200 líneas)
      * Reemplazado callback hell con operadores RxJS
      * Código más mantenible y robusto
      * Mejor manejo de errores con catchError
    
    ✨ NUEVAS FUNCIONALIDADES (v2.1.0):
    - Added: Sistema completo de skeleton components con Tailwind CSS
      * Componentes granulares para carga progresiva inteligente
      * Implementación en componentes principales de la aplicación
      * Carga condicional y eventos reales de carga
    
    - Added: AccessibleLoadingComponent para reemplazar loadings de Ionic
      * Accesibilidad completa compatible con lectores de pantalla
      * Focus management apropiado y navegación por teclado
      * Soporte para modo oscuro, alto contraste y reducción de movimiento
    
    🐛 CORRECCIONES Y MEJORAS (v2.0.10):
    - Fixed: Sistema de gestión de versiones con backend
    - Fixed: Panel de administración con diseño profesional
    - Fixed: Soporte para actualizaciones opcionales, forzadas y modo mantenimiento
    - Fixed: Verificación automática con cache inteligente
    
    ✨ FUNCIONALIDADES BASE (v2.0.9):
    - Sistema completo de gestión de versiones
    - Panel de administración con Tailwind CSS
    - Logging estructurado con LogService
    - Traducciones completas (i18n)
    - Funcionalidad offline con configuración local
  `.trim(),
  minRequiredVersion: undefined,
  forceUpdate: false,
  maintenanceMode: false,
  maintenanceMessage: undefined,
  downloadUrl: undefined
};

/**
 * Version comparison utilities
 */
export class VersionUtils {
  /**
   * Compare two version strings
   * @param version1 First version
   * @param version2 Second version
   * @returns 1 if version1 > version2, -1 if version1 < version2, 0 if equal
   */
  static compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    const maxLength = Math.max(v1Parts.length, v2Parts.length);
    
    for (let i = 0; i < maxLength; i++) {
      const v1 = v1Parts[i] || 0;
      const v2 = v2Parts[i] || 0;
      
      if (v1 > v2) return 1;
      if (v1 < v2) return -1;
    }
    
    return 0;
  }

  /**
   * Check if a version is newer than another
   */
  static isNewer(version1: string, version2: string): boolean {
    return this.compareVersions(version1, version2) > 0;
  }

  /**
   * Check if a version is older than another
   */
  static isOlder(version1: string, version2: string): boolean {
    return this.compareVersions(version1, version2) < 0;
  }

  /**
   * Check if a version meets minimum requirements
   */
  static meetsMinimumVersion(currentVersion: string, minRequiredVersion: string): boolean {
    return this.compareVersions(currentVersion, minRequiredVersion) >= 0;
  }

  /**
   * Format version for display
   */
  static formatVersion(version: string, buildNumber?: string): string {
    if (buildNumber) {
      return `${version} (Build ${buildNumber})`;
    }
    return version;
  }

  /**
   * Parse version string to get major, minor, patch
   */
  static parseVersion(version: string): { major: number; minor: number; patch: number } {
    const parts = version.split('.').map(Number);
    return {
      major: parts[0] || 0,
      minor: parts[1] || 0,
      patch: parts[2] || 0
    };
  }
}

/**
 * Version update utilities
 */
export class VersionUpdateUtils {
  /**
   * Increment patch version
   */
  static incrementPatch(version: string): string {
    const parsed = VersionUtils.parseVersion(version);
    return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  }

  /**
   * Increment minor version
   */
  static incrementMinor(version: string): string {
    const parsed = VersionUtils.parseVersion(version);
    return `${parsed.major}.${parsed.minor + 1}.0`;
  }

  /**
   * Increment major version
   */
  static incrementMajor(version: string): string {
    const parsed = VersionUtils.parseVersion(version);
    return `${parsed.major + 1}.0.0`;
  }

  /**
   * Generate new build number
   */
  static generateBuildNumber(): string {
    return Date.now().toString();
  }

  /**
   * Generate release date
   */
  static generateReleaseDate(): string {
    return new Date().toISOString();
  }
}

/**
 * Development utilities for version management
 */
export class DevVersionUtils {
  /**
   * Create a new version configuration
   */
  static createNewVersion(
    currentVersion: string,
    updateType: 'patch' | 'minor' | 'major' = 'patch',
    changelog: string = '',
    options: Partial<AppVersionConfig> = {}
  ): AppVersionConfig {
    let newVersion: string;
    
    switch (updateType) {
      case 'major':
        newVersion = VersionUpdateUtils.incrementMajor(currentVersion);
        break;
      case 'minor':
        newVersion = VersionUpdateUtils.incrementMinor(currentVersion);
        break;
      default:
        newVersion = VersionUpdateUtils.incrementPatch(currentVersion);
    }

    return {
      version: newVersion,
      buildNumber: VersionUpdateUtils.generateBuildNumber(),
      releaseDate: VersionUpdateUtils.generateReleaseDate(),
      changelog: changelog.trim(),
      minRequiredVersion: options.minRequiredVersion,
      forceUpdate: options.forceUpdate || false,
      maintenanceMode: options.maintenanceMode || false,
      maintenanceMessage: options.maintenanceMessage,
      downloadUrl: options.downloadUrl
    };
  }

  /**
   * Export version configuration for backend
   */
  static exportForBackend(config: AppVersionConfig): any {
    return {
      version: config.version,
      buildNumber: config.buildNumber,
      releaseDate: config.releaseDate,
      minRequiredVersion: config.minRequiredVersion,
      forceUpdate: config.forceUpdate,
      changelog: config.changelog,
      downloadUrl: config.downloadUrl,
      maintenanceMode: config.maintenanceMode,
      maintenanceMessage: config.maintenanceMessage
    };
  }
} 