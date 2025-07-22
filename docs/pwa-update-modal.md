# Modal de Actualización PWA

## Descripción

El modal de actualización PWA ha sido rediseñado para ser más profesional, minimalista y bloqueante. Ahora aparece centrado en la pantalla y no se puede cerrar hasta que el usuario actualice la aplicación.

## Características

### 🎨 Diseño Profesional
- Modal centrado con animaciones suaves
- Diseño minimalista y moderno
- Gradiente de colores en el header
- Iconografía clara y descriptiva

### 🔒 Modal Bloqueante
- **No se puede cerrar** hasta que el usuario actualice
- Bloquea completamente la interacción con la app
- Previene el scroll del body
- Z-index alto para estar siempre visible

### 📱 Responsive
- Adaptado para móviles y tablets
- Tamaños optimizados para diferentes pantallas
- Botones y textos escalables

### ⚙️ Funcionalidades
- Muestra información de versiones
- Toggle para activar actualizaciones automáticas
- Botón único de "Actualizar ahora"
- Spinner durante la actualización

## Estructura del Modal

```
┌─────────────────────────────────┐
│        🔄 Header                │
│   Actualización Disponible      │
│ Una nueva versión está lista... │
├─────────────────────────────────┤
│        📋 Body                  │
│ Versión actual: abc12345...     │
│ Nueva versión: def67890...      │
│                                 │
│ Esta actualización incluye...   │
│                                 │
│ ☑ Activar actualizaciones auto  │
├─────────────────────────────────┤
│        🔘 Footer                │
│    [Actualizar ahora]           │
└─────────────────────────────────┘
```

## Implementación

### Componente
- **Archivo:** `src/app/modules/shared/components/pwa-update-notification/pwa-update-notification.component.ts`
- **Selector:** `app-pwa-update-notification`

### Estilos
- **Componente:** Estilos encapsulados en el componente
- **Globales:** `src/global.scss` (estilos para modal-open)

### Servicio
- **Archivo:** `src/app/modules/shared/services/pwa-update.service.ts`
- **Método de prueba:** `simulateUpdate()` (solo en desarrollo)

## Uso

### Automático
El modal aparece automáticamente cuando se detecta una actualización disponible.

### Manual (Desarrollo)
En modo desarrollo, puedes usar el botón "Test PWA Update" en la esquina superior izquierda para simular una actualización.

### Programático
```typescript
// Simular actualización (solo desarrollo)
this.pwaUpdateService.simulateUpdate();

// Verificar actualizaciones
this.pwaUpdateService.checkForUpdates();

// Aplicar actualización
this.pwaUpdateService.applyUpdate();
```

## Personalización

### Colores
Los colores usan las variables CSS de Ionic:
- `--ion-color-primary`
- `--ion-color-primary-shade`
- `--ion-color-light`
- `--ion-color-medium`
- `--ion-color-dark`
- `--ion-color-success`

### Tamaños
- **Desktop:** Máximo 480px de ancho
- **Mobile:** Margen de 16px
- **Header:** 64px de altura del icono
- **Botón:** 56px de altura

### Animaciones
- **Entrada:** Scale + translateY con fade
- **Backdrop:** Opacity + visibility
- **Duración:** 0.3s ease-in-out

## Comportamiento

### Bloqueo de la App
1. Se agrega la clase `modal-open` al body
2. Se previene el scroll
3. Se deshabilitan los pointer-events del contenido
4. Solo el modal puede recibir interacciones

### Actualización
1. Usuario hace clic en "Actualizar ahora"
2. Se muestra spinner
3. Se ejecuta `pwaUpdateService.applyUpdate()`
4. La página se recarga automáticamente

### Limpieza
- La clase `modal-open` se remueve al destruir el componente
- Los recursos se limpian correctamente

## Testing

### En Desarrollo
1. Ejecuta la app en modo desarrollo
2. Busca el botón "Test PWA Update" en la esquina superior izquierda
3. Haz clic para simular una actualización
4. Verifica que el modal aparezca y sea bloqueante

### En Producción
1. Despliega una nueva versión
2. El modal aparecerá automáticamente
3. Verifica que no se pueda cerrar sin actualizar

## Consideraciones

### Accesibilidad
- El modal es completamente accesible por teclado
- Los textos son legibles y descriptivos
- Los colores tienen suficiente contraste

### Rendimiento
- El modal se carga solo cuando es necesario
- Las animaciones son optimizadas
- No afecta el rendimiento de la app

### Seguridad
- Solo se puede cerrar actualizando
- No hay escape keys ni clicks fuera del modal
- Previene el uso de la app sin actualizar
