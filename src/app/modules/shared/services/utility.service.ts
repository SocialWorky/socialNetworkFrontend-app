import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UtilityService {
  constructor() {}

  /**
   * Pausa la ejecución durante un tiempo determinado.
   * @param ms - Tiempo en milisegundos.
   * @returns Una promesa que se resuelve después del tiempo especificado.
   */
  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
