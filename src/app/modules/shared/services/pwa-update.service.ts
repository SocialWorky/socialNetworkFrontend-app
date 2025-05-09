import { Injectable } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

@Injectable({
  providedIn: 'root',
})
export class PwaUpdateService {
  constructor(private swUpdate: SwUpdate) {
    this.swUpdate.versionUpdates.subscribe(event => {
      if (event.type === 'VERSION_READY') {
        console.log('¡Nueva versión disponible! ¿Recargar para actualizar?');
        if (confirm('¡Nueva versión disponible! ¿Recargar ahora?')) {
          window.location.reload();
        }
      }
    });
  }

  public checkForUpdates(): void {
    this.swUpdate.checkForUpdate().then(() => console.log('Chequeo de actualizaciones completado.')).catch(
      err => console.error('Error al verificar actualizaciones: ', err)
    );
  }
}
