import { Injectable } from '@angular/core';
import { LoadingController } from '@ionic/angular';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private isLoading = true;

  constructor(private loadingController: LoadingController) {}

  setLoading(loading: boolean): void {
    this.isLoading = loading;
  }

  getLoading(): boolean {
    return this.isLoading;
  }

  /**
   * Creates and presents a loading spinner with accessibility considerations
   * @param message - The message to display
   * @param options - Additional loading options
   * @returns Promise that resolves when loading is presented
   */
  async showLoading(message: string = 'Cargando...', options: any = {}): Promise<HTMLIonLoadingElement> {
    const loading = await this.loadingController.create({
      message,
      ...options,
      // Ensure proper accessibility attributes
      cssClass: 'accessible-loading',
      backdropDismiss: false,
      showBackdrop: true
    });

    await loading.present();
    
    // Ensure the loading element has proper focus management
    setTimeout(() => {
      const loadingElement = loading.querySelector('.loading-wrapper');
      if (loadingElement) {
        (loadingElement as HTMLElement).setAttribute('tabindex', '-1');
        (loadingElement as HTMLElement).focus();
      }
    }, 100);

    return loading;
  }

  /**
   * Dismisses the top loading spinner
   * @returns Promise that resolves when loading is dismissed
   */
  async hideLoading(): Promise<void> {
    const loading = await this.loadingController.getTop();
    if (loading) {
      await loading.dismiss();
    }
  }

  /**
   * Dismisses all loading spinners
   * @returns Promise that resolves when all loadings are dismissed
   */
  async hideAllLoadings(): Promise<void> {
    await this.loadingController.dismiss();
  }

  /**
   * Alternative method that uses a more accessible approach
   * This can be used in components that want to avoid aria-hidden issues
   * @param message - The message to display
   * @param subMessage - Optional sub-message
   * @returns An object with show and hide methods
   */
  createAccessibleLoading(message: string = 'Cargando...', subMessage: string = '') {
    return {
      show: () => {
        // Create a loading element that doesn't trigger aria-hidden issues
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'accessible-loading-overlay';
        loadingOverlay.setAttribute('role', 'dialog');
        loadingOverlay.setAttribute('aria-modal', 'true');
        loadingOverlay.setAttribute('aria-label', message);
        loadingOverlay.tabIndex = -1;
        
        loadingOverlay.innerHTML = `
          <div class="accessible-loading-content">
            <div class="loading-spinner">
              <div class="spinner-ring"></div>
              <div class="spinner-ring"></div>
              <div class="spinner-ring"></div>
            </div>
            <div class="loading-message" role="status" aria-live="polite">${message}</div>
            ${subMessage ? `<div class="loading-sub-message">${subMessage}</div>` : ''}
          </div>
        `;
        
        document.body.appendChild(loadingOverlay);
        loadingOverlay.focus();
        
        return loadingOverlay;
      },
      hide: (element: HTMLElement) => {
        if (element && element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }
    };
  }
}
