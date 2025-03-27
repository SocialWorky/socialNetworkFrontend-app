# LogService

El `LogService` se utiliza para registrar y enviar logs a un servidor remoto. Permite almacenar logs localmente y enviarlos en lotes para mejorar la eficiencia.

## Uso

Para utilizar el `LogService`, primero inyecta el servicio en tu componente o servicio:

```typescript
import { Component } from '@angular/core';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';

@Component({
  selector: 'app-ejemplo-log',
  templateUrl: './ejemplo-log.component.html',
})
export class EjemploLogComponent {
  constructor(private _logService: LogService) {}

  registrarLog() {
    this._logService.log(
      LevelLogEnum.INFO,
      'EjemploLogComponent',
      'Este es un mensaje de información'
      {                    // Opcional
        user: currentUser, // Pero es importante incluir información relevante
        notificationId,    // O cualquier otra información relevante
        message: error,    // para posterior análisis
      },                   // Todo como objeto
    );
  }
}
