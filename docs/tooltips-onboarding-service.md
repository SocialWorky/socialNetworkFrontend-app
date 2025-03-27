# TooltipsOnboardingService

El `TooltipsOnboardingService` se utiliza para guiar a los usuarios a través de la aplicación mediante tooltips interactivos. Utiliza la biblioteca `driver.js` para crear un recorrido de onboarding.

## Uso

Para utilizar el `TooltipsOnboardingService`, primero inyecta el servicio en tu componente:

```typescript
import { Component } from '@angular/core';
import { TooltipsOnboardingService } from '@shared/services/tooltips-onboarding.service';

@Component({
  selector: 'app-ejemplo-onboarding',
  templateUrl: './ejemplo-onboarding.component.html',
})
export class EjemploOnboardingComponent {
  constructor(private _onboardingService: TooltipsOnboardingService) {}

  iniciarOnboarding() {
    const pasos = [
      {
        element: '#elemento1',
        popover: {
          title: 'Bienvenido',
          description: 'Este es el primer paso de tu recorrido.',
          position: 'bottom'
        }
      },
      {
        element: '#elemento2',
        popover: {
          title: 'Siguiente Paso',
          description: 'Aquí puedes encontrar más información.',
          position: 'right'
        }
      }
    ];

    this._onboardingService.start(pasos);
  }
}
