import { Injectable } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

@Injectable({
  providedIn: 'root',
})
export class PwaUpdateService {
  constructor(private swUpdate: SwUpdate) {
    this.swUpdate.versionUpdates.subscribe(event => {
      if (event.type === 'VERSION_READY') {
        if (confirm('¡Nueva versión disponible! ¿Recargar ahora?')) {
          window.location.reload();
        }
      }
    });
  }

  public checkForUpdates(): void {
    this.swUpdate.checkForUpdate().then();
  }
}
