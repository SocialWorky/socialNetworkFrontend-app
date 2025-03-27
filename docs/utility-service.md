# UtilityService

El `UtilityService` ofrece métodos utilitarios que pueden ser utilizados en diferentes partes de la aplicación. Actualmente, proporciona un método para pausar la ejecución de código.

## Uso

Para utilizar el `UtilityService`, primero inyecta el servicio en tu componente:

```typescript
import { Component } from '@angular/core';
import { UtilityService } from '@shared/services/utility.service';

@Component({
  selector: 'app-ejemplo-utilidad',
  templateUrl: './ejemplo-utilidad.component.html',
})
export class EjemploUtilidadComponent {
  constructor(private _utilityService: UtilityService) {}

  async ejecutarConPausa() {
    console.log('Inicio de la pausa');
    await this._utilityService.sleep(2000); // Pausa de 2 segundos
    console.log('Fin de la pausa');
  }
}
