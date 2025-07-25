# 🦴 Sistema de Skeleton Components con Tailwind CSS - Guía Completa

## 📋 Resumen

Este sistema de skeleton components proporciona una experiencia de carga moderna y profesional usando **Tailwind CSS** para evitar estilos personalizados y reducir el tamaño del bundle. Incluye tanto skeletons generales como **skeletons granulares por elemento individual**.

## 🎯 Componentes Disponibles

### 1. **SkeletonComponent** (`worky-skeleton`)
Componente base para crear elementos skeleton individuales usando **Tailwind CSS**.

**Tipos disponibles:**
- `text` - Líneas de texto
- `avatar` - Avatares circulares
- `image` - Imágenes rectangulares
- `button` - Botones
- `publication` - Publicaciones completas
- `profile` - Perfiles de usuario
- `comment` - Comentarios
- `list-item` - Elementos de lista
- `card` - Tarjetas

### 2. **SkeletonListComponent** (`worky-skeleton-list`)
Componente para mostrar múltiples skeletons del mismo tipo.

### 3. **SkeletonWrapperComponent** (`worky-skeleton-wrapper`)
Componente wrapper que maneja automáticamente la transición entre skeleton y contenido real.

### 4. **SkeletonService**
Servicio para manejar estados de carga de manera global.

### 5. **Skeletons Individuales** (Nuevos)
Componentes específicos para elementos individuales:

- **`worky-text-skeleton`** - Para líneas de texto individuales
- **`worky-avatar-skeleton`** - Para avatares individuales
- **`worky-image-skeleton`** - Para imágenes individuales
- **`worky-button-skeleton`** - Para botones individuales

## 🚀 Uso Básico

### **Skeleton Individual**
```html
<!-- Skeleton básico de texto -->
<worky-skeleton type="text" width="200px" height="20px"></worky-skeleton>

<!-- Skeleton de avatar -->
<worky-skeleton type="avatar" width="40px" height="40px" rounded="true"></worky-skeleton>

<!-- Skeleton de imagen -->
<worky-skeleton type="image" width="100%" height="200px"></worky-skeleton>
```

### **Skeletons Granulares (Nuevos)**
```html
<!-- Texto individual -->
<worky-text-skeleton width="120px"></worky-text-skeleton>

<!-- Avatar individual -->
<worky-avatar-skeleton size="40px"></worky-avatar-skeleton>

<!-- Imagen individual -->
<worky-image-skeleton width="100%" height="200px"></worky-image-skeleton>

<!-- Botón individual -->
<worky-button-skeleton width="100px" height="36px"></worky-button-skeleton>
```

### **Lista de Skeletons**
```html
<!-- Lista de 5 publicaciones skeleton -->
<worky-skeleton-list
  type="publication"
  [count]="5"
  [showMedia]="true">
</worky-skeleton-list>

<!-- Lista de 3 perfiles skeleton -->
<worky-skeleton-list
  type="profile"
  [count]="3">
</worky-skeleton-list>
```

### **Wrapper con Contenido Real**
```html
<worky-skeleton-wrapper
  [isLoading]="loaderPublications"
  skeletonType="publication"
  [skeletonCount]="5"
  [showMedia]="true"
  loadingMessage="Cargando publicaciones...">
  
  <ng-template>
    <!-- Contenido real aquí -->
    <div *ngFor="let publication of publications">
      <worky-publication-view [publication]="publication"></worky-publication-view>
    </div>
  </ng-template>
</worky-skeleton-wrapper>
```

## 📱 Implementación en Componentes

### **PublicationViewComponent** ✅ COMPLETADO Y MEJORADO
**Implementación granular por elemento individual:**

```typescript
// Estados de carga individuales
avatarLoading: boolean = true;
nameLoading: boolean = true;
contentLoading: boolean = true;
mediaLoading: boolean = true;
locationLoading: boolean = true;
dateLoading: boolean = true;
actionsLoading: boolean = true;

// Métodos para manejar carga
onAvatarLoad() {
  this.avatarLoading = false;
  this._cdr.markForCheck();
}

onContentLoad() {
  this.contentLoading = false;
  this._cdr.markForCheck();
}

// Carga progresiva inteligente
private simulateProgressiveLoading() {
  // Load basic elements first
  this.onNameLoad();
  this.onDateLoad();
  this.onLocationLoad();
  this.onActionsLoad();
  
  // Load content if exists
  if (this.publication.content) {
    this.onContentLoad();
  }
  
  // Load avatar if exists
  if (this.publication.author.avatar) {
    this.onAvatarLoad();
  }
  
  // Load media if exists
  if (this.publication.media.length > 0) {
    this.onMediaLoad();
  }
}
```

```html
<!-- Avatar con skeleton individual -->
<div *ngIf="avatarLoading" class="avatar-container">
  <worky-avatar-skeleton size="40px"></worky-avatar-skeleton>
</div>
<worky-avatar *ngIf="!avatarLoading"
  [size]="40"
  [img]="publication.author.avatar"
  [name]="publication.author.name + ' ' + publication.author.lastName"
  (load)="onAvatarLoad()"
  (error)="onAvatarError()">
</worky-avatar>

<!-- Contenido con skeleton individual -->
<div class="publication-content" *ngIf="publication.content">
  <div *ngIf="contentLoading" class="content-skeleton">
    <worky-text-skeleton width="100%"></worky-text-skeleton>
    <worky-text-skeleton width="80%"></worky-text-skeleton>
    <worky-text-skeleton width="60%"></worky-text-skeleton>
  </div>
  <div class="content markdown" *ngIf="!contentLoading">
    <!-- Contenido real -->
  </div>
</div>

<!-- Botones de acción con skeleton individual -->
<div class="publication-footer-actions">
  <div class="publication-footer-actions-item" *ngIf="actionsLoading">
    <worky-button-skeleton width="60px" height="30px"></worky-button-skeleton>
  </div>
  <div class="publication-footer-actions-item" *ngIf="!actionsLoading">
    <worky-reactions [publication]="publication"></worky-reactions>
  </div>
</div>
```

**Características implementadas:**
- ✅ Skeletons condicionales (no aparecen si no hay contenido)
- ✅ Carga progresiva inteligente
- ✅ Estilos CSS optimizados
- ✅ Eventos de carga reales para avatar
- ✅ Estructura original mantenida

### **AddPublicationComponent** ✅ COMPLETADO Y MEJORADO
**Implementación granular por elemento individual:**

```typescript
// Estados de carga individuales
avatarLoading: boolean = true;
nameLoading: boolean = true;
privacyLoading: boolean = true;
textareaLoading: boolean = true;
locationLoading: boolean = true;
markdownButtonsLoading: boolean = true;
optionsButtonsLoading: boolean = true;
publishButtonLoading: boolean = true;

// Carga progresiva
private simulateProgressiveLoading() {
  this.onNameLoad();
  this.onPrivacyLoad();
  this.onTextareaLoad();
  this.onLocationLoad();
  this.onMarkdownButtonsLoad();
  this.onOptionsButtonsLoad();
  this.onPublishButtonLoad();
  
  if (this.profileImageUrl) {
    this.onAvatarLoad();
  }
}
```

```html
<!-- Avatar con skeleton individual -->
<div *ngIf="avatarLoading" class="avatar-skeleton">
  <worky-avatar-skeleton size="60px"></worky-avatar-skeleton>
</div>
<worky-avatar *ngIf="!avatarLoading && user.name && user.lastName"
  [size]="60"
  img="{{ profileImageUrl }}"
  name="{{ user.name}} {{ user.lastName }}">
</worky-avatar>

<!-- Botones markdown con skeleton individual -->
<div *ngIf="markdownButtonsLoading" class="markdown-skeleton">
  <worky-button-skeleton width="30px" height="30px"></worky-button-skeleton>
  <worky-button-skeleton width="30px" height="30px"></worky-button-skeleton>
  <!-- ... más botones ... -->
</div>
<div *ngIf="!markdownButtonsLoading" class="markdown-buttons-container">
  <!-- Botones reales -->
</div>

<!-- Botón de publicar con skeleton individual -->
<div *ngIf="publishButtonLoading" class="publish-skeleton">
  <worky-button-skeleton width="100%" height="40px"></worky-button-skeleton>
</div>
<worky-buttons *ngIf="!publishButtonLoading && !loaderSavePublication && myForm.valid">
  <!-- Botón real -->
</worky-buttons>
```

**Características implementadas:**
- ✅ Skeletons condicionales (no aparecen si no hay contenido)
- ✅ Carga progresiva inteligente
- ✅ Estilos CSS optimizados
- ✅ Eventos de carga reales para avatar
- ✅ Alineación correcta de botones después de skeleton

### **HomeComponent** ✅ COMPLETADO
```html
<!-- Reemplazar el loader simple -->
<worky-skeleton-wrapper
  [isLoading]="loaderPublications"
  skeletonType="publication"
  [skeletonCount]="5"
  [showMedia]="true"
  loadingMessage="Cargando publicaciones...">
  
  <ng-template>
    <ng-container *ngFor="let publication of publications(); let i = index; trackBy: trackById">
      <div class="worky-module-container">
        <worky-publication-view [publication]="publication"></worky-publication-view>
      </div>
    </ng-container>
  </ng-template>
</worky-skeleton-wrapper>
```

### **ProfilesComponent** ✅ COMPLETADO
```html
<!-- Skeleton para el perfil completo -->
<worky-skeleton-wrapper
  [isLoading]="!userData"
  skeletonType="profile"
  [skeletonCount]="1"
  loadingMessage="Cargando perfil...">
  
  <ng-template>
    <!-- Contenido del perfil -->
    <div class="profile-container">
      <!-- ... contenido del perfil ... -->
    </div>
  </ng-template>
</worky-skeleton-wrapper>

<!-- Skeleton para las publicaciones del perfil -->
<worky-skeleton-wrapper
  [isLoading]="loaderPublications"
  skeletonType="publication"
  [skeletonCount]="3"
  [showMedia]="true"
  loadingMessage="Cargando publicaciones...">
  
  <ng-template>
    <!-- Publicaciones del perfil -->
  </ng-template>
</worky-skeleton-wrapper>
```

## 🎨 Características de Tailwind CSS

### **Clases Utilizadas:**
- **Colores**: `bg-gray-200`, `bg-gray-300`, `text-gray-600`
- **Espaciado**: `p-4`, `gap-3`, `space-y-2`, `mb-4`
- **Flexbox**: `flex`, `items-center`, `justify-between`
- **Animaciones**: `animate-pulse`, `animate-spin`, `animate-shimmer`
- **Responsive**: `w-full`, `h-48`, `rounded-lg`

### **Animación Shimmer Personalizada:**
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      animation: {
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
}
```

## 🔧 Uso del SkeletonService

### **En el Componente**
```typescript
import { SkeletonService } from '@shared/services/skeleton.service';

export class MyComponent {
  constructor(private skeletonService: SkeletonService) {}

  ngOnInit() {
    // Iniciar carga
    this.skeletonService.startLoading('myComponent', {
      type: 'publication',
      count: 5,
      showMedia: true
    }, 'Cargando contenido...');

    // Cargar datos
    this.loadData().subscribe({
      next: (data) => {
        this.data = data;
        // Detener carga
        this.skeletonService.stopLoading('myComponent');
      },
      error: (error) => {
        this.skeletonService.stopLoading('myComponent');
      }
    });
  }
}
```

## 📊 Configuraciones Predefinidas

### **Publicaciones**
```typescript
{
  type: 'publication',
  count: 5,
  showMedia: true
}
```

### **Perfiles**
```typescript
{
  type: 'profile',
  count: 3
}
```

### **Comentarios**
```typescript
{
  type: 'comment',
  count: 4
}
```

### **Usuarios**
```typescript
{
  type: 'list-item',
  count: 6
}
```

## 🔄 Migración desde Loaders Existentes

### **Antes (Loader Simple)**
```html
<div *ngIf="loaderPublications" class="loader"></div>
<div *ngIf="!loaderPublications">
  <!-- Contenido -->
</div>
```

### **Después (Skeleton Moderno con Tailwind)**
```html
<worky-skeleton-wrapper
  [isLoading]="loaderPublications"
  skeletonType="publication"
  [skeletonCount]="5"
  [showMedia]="true"
  loadingMessage="Cargando publicaciones...">
  
  <ng-template>
    <!-- Contenido -->
  </ng-template>
</worky-skeleton-wrapper>
```

## 🎯 Beneficios

### **Experiencia de Usuario**
- ⚡ **Carga más rápida percibida** - Los usuarios ven contenido inmediatamente
- 🎨 **Interfaz moderna** - Como Facebook, Instagram, LinkedIn
- 📱 **Responsive perfecto** - Se adapta a todos los dispositivos
- ♿ **Accesible** - Indicadores claros de estado
- 🔄 **Carga granular** - Cada elemento se carga independientemente

### **Desarrollo**
- 🔧 **Fácil implementación** - Solo reemplazar loaders existentes
- 📦 **Modular y reutilizable** - Usar en cualquier componente
- 🎨 **Sin estilos personalizados** - Usa solo Tailwind CSS
- 📊 **Bundle más pequeño** - No hay CSS adicional
- 🚀 **Performance optimizada** - Clases CSS puras
- 🎯 **Control granular** - Skeletons por elemento individual

## 🚀 Próximos Pasos

### **Componentes Pendientes de Implementar:**
1. **MessagesComponent** - Para conversaciones y mensajes
2. **NotificationsComponent** - Para notificaciones
3. **SearchComponent** - Para resultados de búsqueda
4. **CommentsComponent** - Para listas de comentarios
5. **UserListComponent** - Para listas de usuarios
6. **WidgetComponents** - Para widgets del sidebar
7. **AdminComponents** - Para paneles de administración
8. **SettingsComponent** - Para configuraciones
9. **MediaViewerComponent** - Para visor de medios
10. **FormsComponent** - Para formularios complejos

### **Mejoras Futuras:**
1. **Crear skeletons específicos** para nuevos tipos de contenido
2. **Optimizar animaciones** según feedback de usuarios
3. **Añadir más configuraciones** según necesidades específicas
4. **Implementar lazy loading** para skeletons pesados
5. **Añadir skeletons para errores** y estados vacíos

## 📝 Notas Importantes

- **Solo usa Tailwind CSS** - No hay estilos personalizados
- **Animaciones suaves** - Shimmer y pulse nativos de Tailwind
- **Completamente responsive** - Se adapta automáticamente
- **Componentes standalone** - Mejor tree-shaking
- **Bundle optimizado** - Sin CSS adicional
- **Carga granular** - Cada elemento se carga independientemente
- **Sin retrasos artificiales** - Los skeletons desaparecen inmediatamente
- **Estructura preservada** - Mantiene el layout original

## 📊 Estado de Implementación

### ✅ **Completados:**
- **PublicationViewComponent** - Implementación granular completa
- **AddPublicationComponent** - Implementación granular completa
- **HomeComponent** - Skeleton wrapper implementado
- **ProfilesComponent** - Skeleton wrapper implementado

### 🔄 **Pendientes:**
- **MessagesComponent** - Requiere implementación
- **NotificationsComponent** - Requiere implementación
- **SearchComponent** - Requiere implementación
- **CommentsComponent** - Requiere implementación
- **UserListComponent** - Requiere implementación
- **WidgetComponents** - Requiere implementación
- **AdminComponents** - Requiere implementación
- **SettingsComponent** - Requiere implementación
- **MediaViewerComponent** - Requiere implementación
- **FormsComponent** - Requiere implementación

### 📋 **Directrices de Implementación:**
1. **Usar skeletons granulares** para componentes complejos
2. **Usar skeleton wrapper** para listas simples
3. **Mantener estructura original** del componente
4. **Implementar carga condicional** para elementos opcionales
5. **Usar eventos reales** de carga cuando sea posible
6. **Optimizar CSS** para alineación correcta
7. **Eliminar retrasos artificiales** en producción

