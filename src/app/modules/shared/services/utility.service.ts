import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UtilityService {

  private unsubscribe$ = new Subject<void>();

  constructor() {}

  /**
   * Pausa la ejecución durante un tiempo determinado.
   * @param ms - Tiempo en milisegundos.
   * @returns Una promesa que se resuelve después del tiempo especificado.
   */
  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPassword(password: string): boolean {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
    return passwordRegex.test(password);
  }

  isVideoUrl(url: string): boolean {
    return /\.(mp4|ogg|webm|avi|mov)$/i.test(url);
  }

  /**
   * Handles image loading errors by setting a fallback image.
   * This method is used to provide a default image when the original image URL fails to load.
   * @param event - The error event from the img element
   * @param fallbackSrc - The fallback image URL to use when the original image fails
   */
  handleImageError(event: Event, fallbackSrc: string): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = fallbackSrc;
  }

}
