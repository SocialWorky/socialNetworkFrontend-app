# WorkyAvatarComponent

El `WorkyAvatarComponent` se utiliza para mostrar avatares de usuario. Puede mostrar una imagen de avatar proporcionada o generar un avatar con iniciales si no se proporciona una imagen.

## Propiedades de Entrada (Inputs)

- username (opcional): Nombre de usuario.
- name (opcional): Nombre completo del usuario.
- img : URL de la imagen de avatar.
- size (opcional): Tamaño del avatar. Valor por defecto es 50.

## Propiedades de Salida (Outputs)

- avatarClicked : Evento emitido cuando se hace clic en el avatar.

## Métodos

- handleAvatarClick() : Método interno que maneja el evento de clic en el avatar y emite avatarClicked.

## Ejemplo de Uso

En tu componente TypeScript, puedes definir el avatarUrl y manejar el evento avatarClicked:

```typescript
  avatarUrl: string = 'URL_ADDRESS.com/avatar.jpg';
  handleAvatarClick() {
    // Lógica cuando se hace clic en el avatar
    console.log('Avatar clicado');
  }
```

## Uso

Primero, importa el componente en tu módulo:

```typescript
import { WorkyAvatarModule } from '../worky-avatar/worky-avatar.module';
@NgModule({
  declarations: [
    // ...
  ],
  imports: [
    // ...
    WorkyAvatarModule,
  ],
  // ...
})
```

Luego, en tu plantilla HTML, puedes utilizar el componente de la siguiente manera:

```html
<worky-avatar
  [username]="'Juan Pérez'"
  [name]="'Juan Pérez'"
  [img]="avatarUrl"
  [size]="50">
</worky-avatar>
```
