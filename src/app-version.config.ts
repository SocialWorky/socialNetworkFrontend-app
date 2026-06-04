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
  version: '3.0.5',
  buildNumber: Date.now().toString(),
  releaseDate: new Date().toISOString(),
  changelog: `
    🎉 GRAN ACTUALIZACIÓN — MONETIZACIÓN Y COMUNIDADES (v3.0.0):

    💳 Suscripciones y pagos:
    - Added: Sistema de suscripciones con planes y muro de funcionalidades premium
    - Added: Integración de pagos con Payku
    - Added: Gestión de suscripciones en panel admin (asignar, cambiar y eliminar planes)
    - Added: Boost packages para impulsar contenido
    - Added: Perfiles de creador y sistema de propinas (tipping)
    - Added: Insignias premium en perfiles y mensajería

    👥 Comunidades:
    - Added: Grupos (creación, detalle, listado, gestión y baneo de miembros)
    - Added: Eventos (creación y listado)
    - Added: Stories con carrusel y visor
    - Added: Descubrimiento de usuarios y publicaciones cercanas

    ✨ Funcionalidades sociales:
    - Added: Insignia de cuenta verificada y toggle de verificación
    - Added: Rechazar solicitudes de amistad
    - Added: Buscador de GIFs y selector de emojis en publicaciones
    - Added: Verificación de edad y aceptación de política de privacidad en el registro
    - Added: Feedback de verificación de email tras el registro

    🛠️ Administración y gestión:
    - Added: Gestión de feature flags y enrutamiento dinámico
    - Added: Gestión de reportes
    - Added: Gestión de plantillas de email
    - Added: Analytics de usuarios y publicaciones
    - Enhanced: Navbar con accesos a eventos y grupos, y controles de administración

    📱 Experiencia móvil y PWA:
    - Added: Navegación inferior móvil (bottom navigation)
    - Improved: Manejo de safe area insets en iOS y cálculo de viewport en móvil
    - Improved: Configuración PWA y scripts de build
    - Added: Componentes skeleton para estados de carga

    🐛 Estabilidad y rendimiento:
    - Fixed: Manejo de errores y gestión de sesión en el flujo de autenticación
    - Improved: Normalización de URLs y carga de imágenes cross-origin
    - Improved: Invalidación de caché de medios y publicaciones
    - Added: Estados de carga/disabled en botones (protección contra doble click)

    🖼️ Imágenes y compatibilidad MinIO:
    - Fixed: Reacciones (emojis) que quedaban cargando infinito por URL inválida
      * Las reacciones se guardaban con la base "horneada" (undefined/emojis/...) → 404
      * Ahora se guarda la ruta relativa y se resuelve la base al mostrar
      * normalizeImageUrl sanea automáticamente rutas ya corruptas (undefined/, null/)
    - Fixed: Portadas y avatares de grupos no cargaban con el mismo origen de error
    - Fixed: Compatibilidad de URLs de medios CON y SIN MinIO
      * El alta de publicaciones/comentarios ya no fija la URL al file-service
      * Toda imagen resuelve su base vía normalizeImageUrl (bucket MinIO o file-service)
    - Added: Soporte de SMTP corporativo en el backend (puerto/SSL configurable, además de Gmail)
    - Fixed: Error 401 al crear/activar/listar versiones en el panel de administración
      * El interceptor de auth excluía /app/version con coincidencia parcial y omitía el token
      * Ahora solo el chequeo público (GET /app/version) va sin token; las operaciones admin lo envían

    🐛 CORRECCIONES DE BUGS (v2.6.1):
    - Fixed: Sistema de gestión de versiones en panel de administración
      * Corregido el manejo de respuestas del backend (no tenía wrapper {success: true})
      * La vista ahora se actualiza correctamente al crear/activar versiones
      * Corregido toggleMaintenanceMode para manejar diferentes estructuras de respuesta
      * Añadido detectChanges() para forzar actualización de Angular

    - Fixed: Fotos de perfil no visibles/actualizables en móvil
      * Añadidos métodos clearImageFromCache() y clearProfileImagesFromCache() en MobileImageCacheService
      * El cache de imágenes ahora se invalida correctamente al cambiar avatar
      * Implementado cache-busting URL (?t=timestamp) para forzar recarga
      * worky-avatar detecta URLs con cache-buster y limpia cache antes de cargar
      * worky-dropdown limpia cache de imágenes de perfil al recibir actualización

    - Improved: Consistencia entre móvil y escritorio
      * Cache-busting funciona en ambas plataformas
      * Invalidación de UserService cache funciona igual en ambos
      * MobileImageCacheService solo afecta a dispositivos móviles

    🔧 MEJORAS DE INFRAESTRUCTURA Y ESTABILIDAD (v2.6.0):
    - Fixed: Corrección de health checks en servicios de Kubernetes
      * Health checks ahora funcionan correctamente en todos los servicios
      * Corrección de errores 404 en probes de liveness y readiness
      * Mejora en el orden de registro de rutas para evitar conflictos
    - Fixed: Corrección de puertos en despliegues de Kubernetes
      * Sincronización de puertos entre secrets, deployments y services
      * Scripts de generación automática para mantener consistencia
      * Corrección de problemas de conectividad en producción
    - Added: Sistema mejorado de manejo de errores de servicios externos
      * Nuevo interceptor para manejar errores CORS y 502 silenciosamente
      * Mejoras en el manejo de errores 404 para endpoints de versión
      * Reducción de ruido en consola del navegador
    - Fixed: Corrección de doble slash en URLs de servicios
      * Normalización de URLs base antes de concatenar rutas
      * Corrección en URLs de Bull Board y otros servicios
    - Enhanced: Configuración de variables de entorno
      * Documentación completa de variables requeridas por servicio
      * Guías de configuración para desarrollo local y producción
      * Validación mejorada de configuración de servicios
    - Improved: Estabilidad y confiabilidad del sistema
      * Mejor manejo de errores de red y servicios no disponibles
      * Interceptores que previenen errores en consola
      * Sistema más robusto ante fallos de servicios externos
    
    🚀 MEJORAS EN EL SISTEMA DE MENSAJERÍA Y NOTIFICACIONES (v2.5.0):
    - Added: Nuevo módulo de mensajería con interfaz renovada
      * Interfaz de usuario moderna y profesional
      * Componentes optimizados para una mejor experiencia de usuario
      * Notificaciones en tiempo real integradas en la barra de navegación
    - Enhanced: Notificaciones de mensajes no leídos
      * Contador de mensajes no leídos en la barra de navegación
      * Actualización en tiempo real del estado de los mensajes
      * Mejoras visuales para identificar rápidamente nuevos mensajes
    - Improved: Rendimiento y estabilidad del chat
      * Carga optimizada de conversaciones y mensajes
      * Reducción del tiempo de respuesta en el envío de mensajes
      * Sistema robusto para manejar grandes volúmenes de datos
    
    🚀 NUEVAS FUNCIONALIDADES Y MEJORAS DE UX (v2.4.0):
    - Added: Sistema de polling inteligente para procesamiento de medios
      * Polling automático cada 5 segundos con timeout de 60 segundos
      * Verificación continua del estado de procesamiento de imágenes y videos
      * Cleanup automático de intervalos en destrucción del componente
      * Mejor experiencia de usuario durante la carga de contenido multimedia
    
    - Enhanced: Estados de carga mejorados con skeleton loading
      * Skeleton loading durante procesamiento de medios en ImageOrganizerComponent
      * Estados visuales claros para el usuario durante operaciones asíncronas
      * Transiciones suaves entre estados de carga y contenido final
      * Feedback visual consistente en toda la aplicación
    
    - Improved: Sistema de traducciones y localización
      * Traducciones completas en español e inglés para formularios
      * Mejoras en el dropdown de destinos del form builder
      * Consistencia en el sistema de i18n en toda la aplicación
      * Soporte mejorado para múltiples idiomas
    
    - Enhanced: Manejo de errores y retry logic
      * Lógica de reintento mejorada en FileUploadService
      * Manejo robusto de errores en servicios de carga
      * Estados de error más informativos para el usuario
      * Recuperación automática de fallos temporales de red
    
    - Optimized: Gestión de estado inmutable
      * Actualizaciones de publicaciones con gestión inmutable de estado
      * Prevención de re-renderizados innecesarios
      * Mejor rendimiento en componentes complejos
      * Estado consistente en toda la aplicación
    
    - Improved: Experiencia de usuario en perfil
      * Mostrar nombre completo en lugar de username en sidebar
      * Información de perfil más clara y profesional
      * Mejor identificación visual de usuarios
      * Consistencia en la presentación de datos de usuario
    
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
    
    ✨ FUNCIONALIDADES BASE (v2.1.0):
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