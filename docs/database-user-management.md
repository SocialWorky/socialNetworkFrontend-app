# Sistema de Gestión de Usuarios en Bases de Datos Locales

## Descripción General

Este sistema implementa una gestión inteligente de bases de datos locales (IndexedDB) que se asocia automáticamente al usuario autenticado, garantizando la separación de datos entre usuarios y la limpieza automática cuando se cambia de usuario.

## Características Principales

### 🔐 Asociación Automática de Usuario
- Cada base de datos se crea con el ID del usuario autenticado
- Separación completa de datos entre usuarios
- Prevención de acceso a datos de otros usuarios

### 🧹 Limpieza Automática
- Limpieza automática al cambiar de usuario
- Limpieza al cerrar sesión
- Limpieza de bases de datos huérfanas

### ⚡ Sincronización Inteligente
- Sincronización automática con el backend
- Configuración personalizable de intervalos de sincronización
- Monitoreo del estado de sincronización

### 📊 Monitoreo y Administración
- Panel de administración para monitorear bases de datos
- Estadísticas de uso y tamaño
- Herramientas de limpieza manual

## Arquitectura del Sistema

### Servicios Principales

#### 1. DatabaseManagerService
```typescript
// Gestión centralizada de todas las bases de datos
@Injectable({
  providedIn: 'root'
})
export class DatabaseManagerService {
  // Inicializa bases de datos para un usuario específico
  async initializeUserDatabases(userId: string): Promise<void>
  
  // Limpia todas las bases de datos
  async clearAllUserData(): Promise<void>
  
  // Obtiene estadísticas de las bases de datos
  async getDatabaseStats(): Promise<DatabaseStats>
}
```

#### 2. MessageDatabaseService (Actualizado)
```typescript
// Base de datos de mensajes con gestión de usuario
export class MessageDatabaseService {
  // Nombre de base de datos incluye ID de usuario
  private getDatabaseName(): string {
    const userId = this.authService.getDecodedToken()?.id;
    return userId ? `WorkyMessagesDB_${userId}` : 'WorkyMessagesDB';
  }
}
```

#### 3. PublicationDatabaseService (Actualizado)
```typescript
// Base de datos de publicaciones con gestión de usuario
export class PublicationDatabaseService {
  // Nombre de base de datos incluye ID de usuario
  private getDatabaseName(): string {
    const userId = this.authService.getDecodedToken()?.id;
    return userId ? `WorkyPublicationsDB_${userId}` : 'WorkyPublicationsDB';
  }
}
```

#### 4. SyncService
```typescript
// Sincronización automática con el backend
export class SyncService {
  // Configuración de sincronización
  interface SyncConfig {
    autoSync: boolean;
    syncInterval: number;
    syncOnConnect: boolean;
    syncOnLogin: boolean;
  }
}
```

## Implementación

### 1. Configuración Inicial

El sistema se inicializa automáticamente en el `AppComponent`:

```typescript
// En app.component.ts
constructor(
  private databaseManager: DatabaseManagerService,
  private syncService: SyncService
) {}

ngOnInit() {
  // El sistema detecta automáticamente el usuario y inicializa las bases de datos
}
```

### 2. Gestión de Login/Logout

#### Login
```typescript
// En login.component.ts
async login() {
  // ... proceso de login ...
  
  // Inicializar bases de datos para el nuevo usuario
  await this._databaseManager.refreshUserDatabases();
  
  // Iniciar sincronización
  this._syncService.onUserLogin();
}
```

#### Logout
```typescript
// En auth.service.ts
clearSession() {
  // Limpiar todas las bases de datos antes de cerrar sesión
  this.databaseManager.clearAllUserData().catch(error => {
    this.logService.log(LevelLogEnum.ERROR, 'Error clearing databases', { error });
  });
  
  // ... resto del proceso de logout ...
}
```

### 3. Uso en Componentes

```typescript
// En cualquier componente que use bases de datos
export class MyComponent {
  constructor(
    private messageDatabase: MessageDatabaseService,
    private publicationDatabase: PublicationDatabaseService
  ) {}

  async loadData() {
    // Las bases de datos se inicializan automáticamente para el usuario actual
    const messages = await this.messageDatabase.getAllMessages();
    const publications = await this.publicationDatabase.getAllPublications();
  }
}
```

## Configuración de Sincronización

### Configuración Automática
```typescript
// Configuración por defecto
const defaultConfig: SyncConfig = {
  autoSync: true,
  syncInterval: 5 * 60 * 1000, // 5 minutos
  syncOnConnect: true,
  syncOnLogin: true
};
```

### Configuración Personalizada
```typescript
// En cualquier componente
constructor(private syncService: SyncService) {}

updateSyncSettings() {
  this.syncService.updateSyncConfig({
    autoSync: true,
    syncInterval: 10 * 60 * 1000, // 10 minutos
    syncOnConnect: false
  });
}
```

## Panel de Administración

### Componente DatabaseMonitorComponent

El panel de administración proporciona:

- **Estado de Salud**: Indicador visual del estado de las bases de datos
- **Estadísticas**: Número de registros, tamaño total, última sincronización
- **Acciones**: Botones para limpiar bases de datos y actualizar estadísticas
- **Monitoreo en Tiempo Real**: Actualización automática cada 30 segundos

### Uso del Panel
```html
<!-- En template de admin -->
<worky-database-monitor></worky-database-monitor>
```

## Utilidades del Sistema

### UtilityService - Funciones de Base de Datos

```typescript
// Verificar soporte de IndexedDB
isIndexedDBSupported(): boolean

// Obtener tamaño de base de datos
async getDatabaseSize(dbName: string): Promise<number>

// Limpiar bases de datos huérfanas
async cleanupOrphanedDatabases(currentUserId: string): Promise<void>
```

## Beneficios del Sistema

### 🔒 Seguridad
- Separación completa de datos entre usuarios
- Prevención de acceso no autorizado a datos
- Limpieza automática al cambiar de usuario

### ⚡ Rendimiento
- Datos locales para acceso rápido
- Sincronización inteligente con el backend
- Carga inicial más rápida de la aplicación

### 🛠️ Mantenibilidad
- Gestión centralizada de bases de datos
- Monitoreo y administración integrados
- Logging detallado para debugging

### 📱 Experiencia de Usuario
- Funcionamiento offline con datos locales
- Sincronización transparente en segundo plano
- Indicadores de estado de sincronización

## Consideraciones de Implementación

### 1. Compatibilidad
- Verificar soporte de IndexedDB antes de usar
- Fallback a localStorage si IndexedDB no está disponible
- Manejo de errores robusto

### 2. Rendimiento
- Límites en el número de registros por base de datos
- Limpieza automática de datos antiguos
- Optimización de consultas

### 3. Seguridad
- Validación de tokens de autenticación
- Sanitización de datos antes del almacenamiento
- Logging de eventos de seguridad

### 4. Escalabilidad
- Soporte para múltiples tipos de datos
- Configuración flexible de sincronización
- Arquitectura modular para futuras expansiones

## Troubleshooting

### Problemas Comunes

1. **Base de datos no se inicializa**
   - Verificar que el usuario esté autenticado
   - Revisar logs de error en la consola
   - Verificar soporte de IndexedDB

2. **Sincronización falla**
   - Verificar conectividad de red
   - Revisar configuración de sincronización
   - Verificar permisos de API

3. **Datos no se limpian al cambiar usuario**
   - Verificar que el logout se ejecute correctamente
   - Revisar logs de DatabaseManagerService
   - Verificar que el usuario ID cambie correctamente

### Logs de Debugging

El sistema incluye logging detallado:

```typescript
// Ejemplo de logs generados
logService.log(LevelLogEnum.INFO, 'DatabaseManagerService', 'User changed, clearing databases', {
  oldUserId: 'user123',
  newUserId: 'user456'
});
```

## Futuras Mejoras

1. **Sincronización Bidireccional**: Sincronizar cambios locales con el backend
2. **Compresión de Datos**: Reducir el tamaño de almacenamiento
3. **Backup Automático**: Crear copias de seguridad de datos importantes
4. **Migración de Esquemas**: Actualización automática de estructuras de base de datos
5. **Análisis de Uso**: Métricas detalladas de uso de bases de datos 