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
  version: '2.0.10',
  buildNumber: Date.now().toString(),
  releaseDate: new Date().toISOString(),
  changelog: `
    🐛 CORRECCIONES Y MEJORAS (v2.0.10):
    - Fixed: Alertas de actualización con botones funcionales (Actualizar/Cancelar)
    - Fixed: Lógica de forceUpdate solo aplica con versiones diferentes
    - Fixed: Traducciones correctas en alerts (botón "Aceptar" vs keys)
    - Fixed: Feedback completo en verificación manual de actualizaciones
    - Improved: Intervalos conservadores (2h periódico, 1h al inicio)
    - Added: Botón "Verificar actualizaciones" en menú de usuario
    - Added: Versión sutil en menú (sin ícono, alineada a la derecha)
    - Removed: Botón "Instalar Aplicación" innecesario
    - Removed: AppUpdateModalComponent duplicado
    - Removed: Código PWA obsoleto y console.log temporales

    ✨ FUNCIONALIDADES BASE (v2.0.9):
    - Sistema completo de gestión de versiones con backend
    - Panel de administración con diseño profesional (Tailwind CSS)
    - Soporte para actualizaciones opcionales, forzadas y modo mantenimiento
    - Verificación automática con cache inteligente
    - Indicadores de estado de conexión con backend
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