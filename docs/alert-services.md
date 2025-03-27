
# AlertService

El `AlertService` se utiliza para mostrar alertas utilizando SweetAlert2. Proporciona una interfaz sencilla para mostrar alertas con opciones personalizables.

## Uso

Para utilizar el `AlertService`, primero inyecta el servicio en tu componente:

```typescript
import { Component } from '@angular/core';
import { AlertService } from '@shared/services/alert.service';
import { Alerts, Position } from '@shared/enums/alerts.enum';

@Component({
  selector: 'app-ejemplo',
  templateUrl: './ejemplo.component.html',
})
export class EjemploComponent {
  constructor(private _alertService: AlertService) {}

  mostrarAlerta() {
    this._alertService.showAlert(
      'Título',
      'Este es un mensaje',
      Alerts.SUCCESS, // Tipo de icono: success, error, warning, info, question
      Position.CENTER, // Posición: top, top-start, top-end, center, center-start, center-end, bottom, bottom-start, bottom-end
      true, // Mostrar botón de confirmación
      'Confirmar', // Texto del botón de confirmación
      ['/inicio'] // Opcional: ruta a navegar al confirmar
    );
  }
}

