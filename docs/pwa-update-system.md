# Sistema de Actualización de PWA

## Descripción General

Este sistema implementa una solución completa para la detección y aplicación automática de actualizaciones en tu aplicación PWA. Incluye notificaciones elegantes, configuración de usuario y herramientas de desarrollo.

## Características Principales

### 🔄 Detección Automática de Actualizaciones
- Verificación periódica cada 30 minutos en producción
- Verificación cada 5 minutos en desarrollo
- Detección inmediata al cargar la aplicación

### 🎨 Notificaciones Elegantes
- Componente de notificación con diseño moderno
- Información detallada de versiones
- Opción de actualización automática
- Botones de acción claros

### ⚙️ Configuración de Usuario
- Toggle para activar/desactivar actualización automática
- Estado de instalación de la PWA
- Información de última verificación
- Botón para verificación manual

### 🛠️ Herramientas de Desarrollo
- Scripts para forzar actualizaciones
- Utilidades para limpiar cache
- Comandos para testing

## Componentes Implementados

### 1. PwaUpdateService
**Ubicación:** `src/app/modules/shared/services/pwa-update.service.ts`

Servicio principal que maneja toda la lógica de actualización:

```typescript
// Verificar actualizaciones manualmente
this.pwaUpdateService.checkForUpdates();

// Aplicar actualización disponible
this.pwaUpdateService.applyUpdate();

// Configurar actualización automática
this.pwaUpdateService.setAutoUpdate(true);

// Obtener estado de actualización automática
const isAutoUpdate = this.pwaUpdateService.getAutoUpdateStatus();
```

### 2. PwaUpdateNotificationComponent
**Ubicación:** `src/app/modules/shared/components/pwa-update-notification/pwa-update-notification.component.ts`

Componente que muestra notificaciones de actualización:

- Aparece automáticamente cuando hay una actualización disponible
- Muestra información de versiones
- Permite configurar actualización automática
- Botones para actualizar o posponer

### 3. PwaNotificationService
**Ubicación:** `src/app/modules/shared/services/pwa-notification.service.ts`

Servicio para mostrar notificaciones toast y alerts:

```typescript
// Mostrar notificación toast
this.pwaNotificationService.showUpdateNotification(updateInfo);

// Mostrar alert de confirmación
this.pwaNotificationService.showUpdateAlert(updateInfo);

// Mostrar progreso de actualización
this.pwaNotificationService.showUpdateProgress();
```

### 4. PwaSettingsComponent
**Ubicación:** `src/app/modules/shared/components/pwa-settings/pwa-settings.component.ts`

Componente de configuración para usuarios:

- Toggle de actualización automática
- Estado de instalación
- Última verificación
- Botones de acción

## Configuración

### Service Worker
El archivo `ngsw-config.json` está configurado para:

- Cachear recursos de la aplicación
- Verificar actualizaciones automáticamente
- Usar estrategia de navegación "freshness"

### Variables de Entorno
Asegúrate de que las siguientes variables estén configuradas:

```typescript
// environment.ts
export const environment = {
  PRODUCTION: false,
  // ... otras configuraciones
};
```

## Uso en la Aplicación

### 1. Inicialización Automática
El sistema se inicializa automáticamente en `AppComponent`:

```typescript
ngOnInit(): void {
  // ... otro código
  this._pwaUpdateService.checkForUpdates();
}
```

### 2. Incluir Componente de Notificación
El componente de notificación se incluye automáticamente en el template principal:

```html
<ion-app id="content-worky" class="content-worky">
  <router-outlet></router-outlet>
  <app-pwa-update-notification></app-pwa-update-notification>
</ion-app>
```

### 3. Usar Componente de Configuración
Para incluir el componente de configuración en cualquier página:

```typescript
import { PwaSettingsComponent } from '@shared/components/pwa-settings/pwa-settings.component';

@Component({
  // ...
  imports: [PwaSettingsComponent]
})
```

```html
<app-pwa-settings></app-pwa-settings>
```

## Scripts de Desarrollo

### Comandos NPM

```bash
# Construir para producción
npm run build:prod

# Servir PWA en modo desarrollo
npm run pwa:dev

# Servir PWA en modo producción para testing
npm run pwa:test

# Limpiar cache del Service Worker
npm run sw:clear

# Ver estado del Service Worker
npm run sw:status
```

### Utilidades del Navegador

En la consola del navegador (solo en desarrollo):

```javascript
// Forzar actualización del Service Worker
PWAUtils.forceServiceWorkerUpdate();

// Limpiar cache
PWAUtils.clearServiceWorkerCache();

// Desregistrar Service Workers
PWAUtils.unregisterService Workers();

// Mostrar estado
PWAUtils.showServiceWorkerStatus();

// Actualización completa (recomendado)
PWAUtils.forceCompleteUpdate();
```

## Flujo de Actualización

### 1. Detección
- El Service Worker verifica automáticamente cada 30 minutos
- Se detecta una nueva versión disponible

### 2. Notificación
- Se muestra el componente de notificación
- El usuario puede configurar actualización automática

### 3. Aplicación
- Si está habilitada la actualización automática, se aplica inmediatamente
- Si no, el usuario puede aplicar manualmente

### 4. Recarga
- La página se recarga automáticamente
- La nueva versión está activa

## Personalización

### Cambiar Intervalos de Verificación
En `PwaUpdateService`:

```typescript
private startPeriodicChecks(): void {
  // Cambiar el intervalo (en milisegundos)
  const checkIntervalMs = environment.PRODUCTION ? 30 * 60 * 1000 : 5 * 60 * 1000;
  // ...
}
```

### Personalizar Notificaciones
En `PwaUpdateNotificationComponent`:

```typescript
// Cambiar el diseño o comportamiento
// Modificar el template y estilos según necesidades
```

### Configurar Cache
En `ngsw-config.json`:

```json
{
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "updateMode": "prefetch",
      "resources": {
        "files": [
          // Agregar o quitar archivos según necesidades
        ]
      }
    }
  ]
}
```

## Troubleshooting

### Problemas Comunes

1. **No se detectan actualizaciones**
   - Verificar que el Service Worker esté registrado
   - Usar `PWAUtils.showServiceWorkerStatus()` para diagnosticar
   - Limpiar cache con `PWAUtils.forceCompleteUpdate()`

2. **Notificaciones no aparecen**
   - Verificar que el componente esté incluido en el template
   - Revisar la consola para errores
   - Verificar que el Service Worker esté habilitado

3. **Actualización no se aplica**
   - Verificar permisos del navegador
   - Limpiar cache del navegador
   - Usar modo incógnito para testing

### Debugging

```javascript
// En la consola del navegador
console.log('Service Worker habilitado:', 'serviceWorker' in navigator);
console.log('Cache habilitado:', 'caches' in window);

// Verificar registros del Service Worker
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Registros:', regs);
});
```

## Mejores Prácticas

1. **Testing**
   - Usar `npm run pwa:test` para testing en producción
   - Probar en diferentes navegadores
   - Verificar en dispositivos móviles

2. **Desarrollo**
   - Usar `PWAUtils.forceCompleteUpdate()` durante desarrollo
   - Verificar logs en la consola
   - Probar diferentes escenarios de actualización

3. **Producción**
   - Monitorear logs de actualización
   - Configurar alertas para errores
   - Documentar cambios importantes

## Soporte

Para problemas o preguntas sobre el sistema de actualización de PWA:

1. Revisar esta documentación
2. Verificar logs en la consola del navegador
3. Usar las herramientas de debugging proporcionadas
4. Consultar la documentación oficial de Angular Service Worker 