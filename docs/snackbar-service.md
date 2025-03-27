# GenericSnackbarService

El `GenericSnackbarService` se utiliza para mostrar mensajes de notificación utilizando Angular Material Snackbar. Ofrece métodos para mostrar mensajes de error e informativos con opciones personalizables.

## Uso

Para utilizar el `GenericSnackbarService`, primero inyecta el servicio en tu componente:

```typescript
import { Component } from '@angular/core';
import { GenericSnackbarService } from '@shared/services/generic-snackbar.service';

@Component({
  selector: 'app-ejemplo-snackbar',
  templateUrl: './ejemplo-snackbar.component.html',
})
export class EjemploSnackbarComponent {
  constructor(private _snackbarService: GenericSnackbarService) {}

  mostrarError() {
    this._snackbarService.error('Ha ocurrido un error inesperado.', true);
  }

  mostrarInfo() {
    this._snackbarService.info('Este es un mensaje informativo.');
  }
}
