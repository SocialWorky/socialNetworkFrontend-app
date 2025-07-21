# Componentes Compartidos del Admin

Este módulo contiene componentes reutilizables para el panel de administración que ayudan a mantener consistencia y reducir la duplicación de código.

## Componentes Disponibles

### 1. PaginationComponent (`worky-pagination`)

Componente de paginación genérico y configurable.

```typescript
interface PaginationConfig {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  itemsPerPage?: number;
  showInfo?: boolean;
  showPageNumbers?: boolean;
  maxPageNumbers?: number;
}
```

**Uso:**
```html
<worky-pagination 
  [config]="paginationConfig"
  (pageChange)="onPageChange($event)">
</worky-pagination>
```

**Ejemplo:**
```typescript
paginationConfig = {
  currentPage: 1,
  totalPages: 10,
  totalItems: 100,
  itemsPerPage: 10,
  showInfo: true,
  showPageNumbers: true,
  maxPageNumbers: 5
};
```

---

### 2. LoadingSpinnerComponent (`worky-loading-spinner`)

Spinner de carga con múltiples variantes y configuraciones.

```typescript
interface LoadingSpinnerConfig {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'white';
  text?: string;
  overlay?: boolean;
  fullScreen?: boolean;
}
```

**Uso:**
```html
<worky-loading-spinner 
  [config]="spinnerConfig"
  [loading]="isLoading">
</worky-loading-spinner>
```

**Ejemplos:**
```typescript
// Spinner simple
spinnerConfig = { size: 'medium', text: 'Cargando...' };

// Spinner con overlay
spinnerConfig = { 
  size: 'large', 
  text: 'Procesando...', 
  overlay: true 
};

// Spinner pantalla completa
spinnerConfig = { 
  size: 'large', 
  text: 'Inicializando...', 
  fullScreen: true 
};
```

---

### 3. ConfirmDialogComponent (`worky-confirm-dialog`)

Diálogo de confirmación con diferentes tipos y estilos.

```typescript
interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  showCancel?: boolean;
  width?: string;
}
```

**Uso:**
```html
<worky-confirm-dialog 
  [config]="dialogConfig"
  [showDialog]="showConfirmDialog"
  (confirm)="onConfirm()"
  (cancel)="onCancel()"
  (close)="onClose()">
</worky-confirm-dialog>
```

**Ejemplos:**
```typescript
// Confirmación de eliminación
dialogConfig = {
  title: 'Eliminar Usuario',
  message: '¿Estás seguro de que deseas eliminar este usuario?',
  confirmText: 'Eliminar',
  cancelText: 'Cancelar',
  type: 'danger'
};

// Información
dialogConfig = {
  title: 'Información',
  message: 'Los cambios se han guardado correctamente.',
  confirmText: 'Aceptar',
  showCancel: false,
  type: 'success'
};
```

---

### 4. SearchInputComponent (`worky-search-input`)

Campo de búsqueda con debounce y configuración flexible.

```typescript
interface SearchInputConfig {
  placeholder?: string;
  debounceTime?: number;
  minLength?: number;
  showClearButton?: boolean;
  showSearchIcon?: boolean;
  size?: 'small' | 'medium' | 'large';
  width?: string;
}
```

**Uso:**
```html
<worky-search-input 
  [config]="searchConfig"
  [initialValue]="searchTerm"
  (search)="onSearch($event)"
  (clear)="onClear()">
</worky-search-input>
```

**Ejemplo:**
```typescript
searchConfig = {
  placeholder: 'Buscar usuarios...',
  debounceTime: 300,
  minLength: 2,
  showClearButton: true,
  showSearchIcon: true,
  size: 'medium'
};
```

---

### 5. StatusBadgeComponent (`worky-status-badge`)

Badge de estado con iconos y colores predefinidos.

```typescript
interface StatusBadgeConfig {
  type: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  showText?: boolean;
  customColor?: string;
  customBgColor?: string;
}
```

**Uso:**
```html
<worky-status-badge 
  [config]="badgeConfig"
  [text]="statusText"
  [icon]="customIcon">
</worky-status-badge>
```

**Ejemplos:**
```typescript
// Badge de estado activo
badgeConfig = { type: 'success', text: 'Activo' };

// Badge solo con icono
badgeConfig = { type: 'warning', showText: false };

// Badge personalizado
badgeConfig = { 
  type: 'info', 
  customColor: '#ff6b6b',
  customBgColor: '#ffe8e8'
};
```

---

### 6. ActionMenuComponent (`worky-action-menu`)

Menú de acciones desplegable con items configurables.

```typescript
interface ActionMenuItem {
  id: string;
  label: string;
  icon?: string;
  type?: 'default' | 'danger' | 'warning' | 'success';
  disabled?: boolean;
  divider?: boolean;
  tooltip?: string;
}

interface ActionMenuConfig {
  triggerIcon?: string;
  triggerText?: string;
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  size?: 'small' | 'medium' | 'large';
  showTriggerIcon?: boolean;
  showTriggerText?: boolean;
}
```

**Uso:**
```html
<worky-action-menu 
  [config]="menuConfig"
  [items]="menuItems"
  [disabled]="isDisabled"
  (actionClick)="onActionClick($event)">
</worky-action-menu>
```

**Ejemplo:**
```typescript
menuConfig = {
  triggerIcon: 'more_vert',
  position: 'bottom-right',
  size: 'medium'
};

menuItems = [
  { id: 'edit', label: 'Editar', icon: 'edit', type: 'default' },
  { id: 'view', label: 'Ver detalles', icon: 'visibility', type: 'default' },
  { divider: true },
  { id: 'delete', label: 'Eliminar', icon: 'delete', type: 'danger' }
];
```

---

## Beneficios

1. **Consistencia**: Todos los componentes siguen el mismo diseño y comportamiento
2. **Reutilización**: Un solo componente para múltiples casos de uso
3. **Mantenibilidad**: Cambios centralizados en un solo lugar
4. **Flexibilidad**: Configuración extensiva para diferentes necesidades
5. **Rendimiento**: Optimizados y ligeros
6. **Accesibilidad**: Incluyen atributos ARIA y navegación por teclado

## Uso en el Proyecto

Para usar estos componentes, simplemente importa el `AdminSharedComponentsModule` en tu módulo:

```typescript
import { AdminSharedComponentsModule } from '@admin/shared/components/admin-shared-components.module';

@NgModule({
  imports: [
    AdminSharedComponentsModule,
    // ... otros imports
  ]
})
export class YourModule { }
```

Luego usa los selectores directamente en tus templates HTML. 