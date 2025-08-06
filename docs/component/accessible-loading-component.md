# AccessibleLoadingComponent

## Descripción

El `AccessibleLoadingComponent` es un componente Angular que proporciona un sistema de loading completamente accesible, diseñado para reemplazar los loadings de Ionic que causan problemas de `aria-hidden`.

## Características

- ✅ **Accesibilidad completa**: Compatible con lectores de pantalla
- ✅ **Focus management**: Manejo apropiado del foco
- ✅ **Keyboard navigation**: Soporte para navegación por teclado
- ✅ **Temas**: Soporte para modo oscuro y alto contraste
- ✅ **Reducción de movimiento**: Respeta las preferencias de accesibilidad
- ✅ **Responsive**: Se adapta a diferentes tamaños de pantalla

## Uso Básico

### 1. Importar el componente

```typescript
import { AccessibleLoadingComponent } from '@shared/components/accessible-loading/accessible-loading.component';
```

### 2. Agregar al template

```html
<worky-accessible-loading
  [show]="isLoading"
  message="Cargando datos..."
  subMessage="Por favor espera"
  [fullscreen]="true">
</worky-accessible-loading>
```

### 3. Controlar desde el componente

```typescript
export class MiComponente {
  isLoading = false;

  async cargarDatos() {
    this.isLoading = true;
    
    try {
      await this.miServicio.obtenerDatos();
    } finally {
      this.isLoading = false;
    }
  }
}
```

## Propiedades de Entrada

| Propiedad | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `show` | `boolean` | `false` | Controla si el loading está visible |
| `message` | `string` | `'Cargando...'` | Mensaje principal del loading |
| `subMessage` | `string` | `''` | Mensaje secundario opcional |
| `fullscreen` | `boolean` | `false` | Si es true, el loading cubre toda la pantalla |
| `ariaLabel` | `string` | `'Cargando contenido'` | Etiqueta ARIA para lectores de pantalla |

## Eventos

| Evento | Descripción |
|--------|-------------|
| `(keydown.escape)` | Se dispara cuando el usuario presiona la tecla Escape |

## Ejemplos de Uso

### Ejemplo 1: Loading básico

```html
<worky-accessible-loading
  [show]="isLoading"
  message="Guardando cambios...">
</worky-accessible-loading>
```

### Ejemplo 2: Loading con sub-mensaje

```html
<worky-accessible-loading
  [show]="isLoading"
  message="Subiendo archivo..."
  subMessage="Procesando imagen de 5MB">
</worky-accessible-loading>
```

### Ejemplo 3: Loading fullscreen

```html
<worky-accessible-loading
  [show]="isLoading"
  message="Iniciando aplicación..."
  subMessage="Configurando entorno"
  [fullscreen]="true">
</worky-accessible-loading>
```

### Ejemplo 4: Loading personalizado

```html
<worky-accessible-loading
  [show]="isLoading"
  message="Sincronizando datos..."
  subMessage="Conectando con el servidor"
  ariaLabel="Sincronización en progreso">
</worky-accessible-loading>
```

## Implementación Completa

### Componente TypeScript

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-mi-componente',
  template: `
    <div class="mi-componente">
      <button (click)="cargarDatos()" [disabled]="isLoading">
        {{ isLoading ? 'Cargando...' : 'Cargar Datos' }}
      </button>
      
      <worky-accessible-loading
        [show]="isLoading"
        message="Cargando datos del servidor..."
        subMessage="Esto puede tomar unos segundos"
        [fullscreen]="true">
      </worky-accessible-loading>
    </div>
  `,
  styleUrls: ['./mi-componente.component.scss']
})
export class MiComponenteComponent {
  isLoading = false;

  async cargarDatos() {
    this.isLoading = true;
    
    try {
      // Simular llamada al servidor
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Tu lógica aquí
      console.log('Datos cargados exitosamente');
      
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      this.isLoading = false;
    }
  }
}
```

## Estilos Personalizados

El componente incluye estilos por defecto que usan las variables de color del proyecto. Para personalizar:

### Importar Variables de Color

```scss
// En tu archivo de estilos
@use 'src/assets/styles/worky-palettes.scss' as colors;

.accessible-loading-overlay {
  // Personalizar el overlay
  background: rgba(0, 0, 0, 0.8);
}

.accessible-loading-content {
  // Personalizar el contenido usando colores del proyecto
  background: colors.$worky-color-module-container;
  color: colors.$worky-color-text;
}

.loading-spinner {
  // Personalizar el spinner con colores del proyecto
  .spinner-ring {
    border-width: 4px;
    
    &:nth-child(1) {
      border-top-color: colors.$worky-color-blue;
    }
    
    &:nth-child(2) {
      border-right-color: colors.$worky-color-green;
    }
    
    &:nth-child(3) {
      border-bottom-color: colors.$worky-color-yellow;
    }
  }
}

.loading-message {
  color: colors.$worky-color-text;
}

.loading-sub-message {
  color: colors.$worky-color-grey;
}
```

### Variables de Color Disponibles

- `colors.$worky-color-blue` - Azul principal
- `colors.$worky-color-green` - Verde
- `colors.$worky-color-yellow` - Amarillo
- `colors.$worky-color-red` - Rojo
- `colors.$worky-color-text` - Color de texto
- `colors.$worky-color-grey` - Color gris
- `colors.$worky-color-module-container` - Fondo de contenedores

## Accesibilidad

### Características de Accesibilidad

- **ARIA Roles**: `role="dialog"` y `aria-modal="true"`
- **Focus Management**: El loading recibe el foco automáticamente
- **Screen Reader Support**: Mensajes con `role="status"` y `aria-live="polite"`
- **Keyboard Navigation**: Soporte para tecla Escape
- **High Contrast**: Compatible con modo alto contraste
- **Reduced Motion**: Respeta las preferencias de reducción de movimiento

### Buenas Prácticas

1. **Mensajes descriptivos**: Usa mensajes que expliquen qué está pasando
2. **Sub-mensajes informativos**: Proporciona información adicional cuando sea útil
3. **Duración apropiada**: No mantengas el loading por más tiempo del necesario
4. **Manejo de errores**: Siempre oculta el loading en caso de error

## Migración desde Ionic Loading

### Antes (Problemático)

```typescript
import { LoadingController } from '@ionic/angular';

export class MiComponente {
  constructor(private loadingCtrl: LoadingController) {}

  async cargarDatos() {
    const loading = await this.loadingCtrl.create({
      message: 'Cargando...'
    });
    await loading.present();
    
    try {
      await this.miServicio.obtenerDatos();
    } finally {
      loading.dismiss();
    }
  }
}
```

### Después (Accesible)

```typescript
export class MiComponente {
  isLoading = false;

  async cargarDatos() {
    this.isLoading = true;
    
    try {
      await this.miServicio.obtenerDatos();
    } finally {
      this.isLoading = false;
    }
  }
}
```

```html
<worky-accessible-loading
  [show]="isLoading"
  message="Cargando datos...">
</worky-accessible-loading>
```

## Ventajas sobre Ionic Loading

1. **Sin problemas de aria-hidden**: No causa conflictos de accesibilidad
2. **Mejor control**: Más fácil de personalizar y controlar
3. **Accesibilidad nativa**: Diseñado con accesibilidad en mente
4. **Menos dependencias**: No depende de Ionic para el loading
5. **Mejor rendimiento**: Más ligero que el loading de Ionic

## Troubleshooting

### El loading no aparece
- Verifica que `[show]="true"`
- Asegúrate de que el componente esté importado en el módulo
- Revisa la consola por errores

### El loading no se oculta
- Verifica que `isLoading = false` se esté ejecutando
- Asegúrate de que esté en un bloque `finally` o `catch`

### Problemas de estilos
- Verifica que los estilos globales estén cargados
- Revisa si hay conflictos de CSS con otros componentes
