# ButtonsComponent

El `ButtonsComponent` se utiliza para crear botones personalizados con diferentes temas y tipos. Este componente es altamente configurable y permite manejar eventos de clic.

## Propiedades de Entrada (Inputs)

- theme : Define el tema del botón. Puede ser uno de los valores de WorkyButtonTheme (e.g., Primary, Accent, Warn).
- workyButtonType : Define el tipo de botón. Puede ser uno de los valores de WorkyButtonType (e.g., Flat, Outline, Basic).
- disabled : Indica si el botón está deshabilitado. Valor por defecto es false .
- width (opcional): Define el ancho del botón. Puede ser cualquier valor CSS válido.
- height (opcional): Define la altura del botón. Puede ser cualquier valor CSS válido.

## Propiedades de Salida (Outputs)

- clickEvent : Evento emitido cuando se hace clic en el botón, siempre que no esté deshabilitado.

## Métodos

- onButtonClick() : Método interno que maneja el evento de clic y emite clickEvent si el botón no está deshabilitado.

## Uso

Para utilizar el `ButtonsComponent`, primero incluir el componente en tu módulo:

```Typescript
import { WorkyButtonsModule } from '../shared/buttons/buttons.module';
@NgModule({
  declarations: [
    // ...
  ],
  imports: [
    // ...
    WorkyButtonsModule,
  ],
  // ...
})
export class AppModule { }
```

En tu componente, puedes utilizar el `ButtonsComponent` de la siguiente manera:

```Typescript
import { Component } from '@angular/core';
import { WorkyButtonTheme, WorkyButtonType } from '@worky-lib/types';
@Component({
  selector: 'app-ejemplo-botones',
  templateUrl: './ejemplo-botones.component.html',
})
export class EjemploBotonesComponent {
  WorkyButtonTheme = WorkyButtonTheme;
  WorkyButtonType = WorkyButtonType;
  onButtonClicked() {
    // Lógica cuando se hace clic en el botón
  }
}
```

En tu plantilla HTML, puedes utilizar el `ButtonsComponent` de la siguiente manera:

```html
<worky-buttons
  [theme]="WorkyButtonTheme.Primary"
  [workyButtonType]="WorkyButtonType.Flat"
  [disabled]="false"
  [width]="'100%'" 
  [height]="'40px'"
  (clickEvent)="onButtonClicked()">
  <span prefix-icon class="material-icons">login</span>  <!--  Icono que se posiciona a la izquierda del texto -->
  <span basic-button-text>Login</span>  <!--  Texto del botón -->
  <span suffix-icon class="material-icons">add_circle_outline</span>  <!--  Icono que se posiciona a la derecha del texto --> 
</worky-buttons>
