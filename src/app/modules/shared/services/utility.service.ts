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
    
    // Prevent console errors by removing the error event listener
    imgElement.onerror = null;
    
    // Set the fallback image
    imgElement.src = fallbackSrc;
    
    // Add error handling for the fallback image as well
    imgElement.onerror = () => {
      imgElement.onerror = null;
      imgElement.style.display = 'none';
    };
  }

  /**
   * Creates an image element with error handling to prevent console errors.
   * This method is used to preload images and handle errors silently.
   * @param src - The image source URL
   * @param fallbackSrc - The fallback image URL
   * @returns A promise that resolves with the successful image URL or rejects with the fallback URL
   */
  preloadImage(src: string, fallbackSrc: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Check if the URL is localhost and might fail
      if (src.includes('localhost:3005')) {
        // For localhost URLs, use fallback immediately to avoid connection errors
        resolve(fallbackSrc);
        return;
      }

      // For non-localhost URLs, use the original approach
      const img = new Image();
      const timeout = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        resolve(fallbackSrc);
      }, 3000); // 3 second timeout
      
      img.onload = () => {
        clearTimeout(timeout);
        resolve(src);
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        // Try fallback image
        const fallbackImg = new Image();
        const fallbackTimeout = setTimeout(() => {
          fallbackImg.onload = null;
          fallbackImg.onerror = null;
          reject(fallbackSrc);
        }, 3000);
        
        fallbackImg.onload = () => {
          clearTimeout(fallbackTimeout);
          resolve(fallbackSrc);
        };
        fallbackImg.onerror = () => {
          clearTimeout(fallbackTimeout);
          reject(fallbackSrc);
        };
        fallbackImg.src = fallbackSrc;
      };
      
      img.src = src;
    });
  }



}
