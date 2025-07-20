import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { DeviceDetectionService } from './device-detection.service';

export interface PullToRefreshConfig {
  threshold: number;
  resistance: number;
  maxPullDistance: number;
}

@Injectable({
  providedIn: 'root'
})
export class PullToRefreshService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private refreshSubject = new Subject<void>();
  
  public refresh$ = this.refreshSubject.asObservable();
  
  private isPulling = false;
  private startY = 0;
  private currentY = 0;
  private pullDistance = 0;
  private isRefreshing = false;
  
  private defaultConfig: PullToRefreshConfig = {
    threshold: 80,
    resistance: 0.6,
    maxPullDistance: 150
  };

  constructor(private deviceDetectionService: DeviceDetectionService) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.refreshSubject.complete();
  }

  /**
   * Inicializa el pull-to-refresh en un elemento contenedor
   */
  initPullToRefresh(
    container: HTMLElement, 
    config: Partial<PullToRefreshConfig> = {}
  ): void {
    if (!this.deviceDetectionService.isMobile()) {
      return;
    }

    const finalConfig = { ...this.defaultConfig, ...config };
    
    // Only apply on mobile devices
    if (!this.deviceDetectionService.isMobile()) {
      return;
    }

    // Prevenir el comportamiento por defecto del scroll
    container.style.overscrollBehavior = 'contain';
    
    // Touch events
    container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    container.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    
    // Eventos del mouse para desarrollo
    container.addEventListener('mousedown', this.handleMouseDown.bind(this), { passive: false });
    container.addEventListener('mousemove', this.handleMouseMove.bind(this), { passive: false });
    container.addEventListener('mouseup', this.handleMouseUp.bind(this), { passive: false });
  }

  /**
   * Limpia los event listeners
   */
  destroyPullToRefresh(container: HTMLElement): void {
    container.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    container.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    container.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    container.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    container.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    container.removeEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  /**
   * Emite el evento de refresh
   */
  triggerRefresh(): void {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshSubject.next();
      
      // Reset after some time
      setTimeout(() => {
        this.isRefreshing = false;
      }, 2000);
    }
  }

  private handleTouchStart(event: TouchEvent): void {
    if (this.isRefreshing) return;
    
    const container = event.currentTarget as HTMLElement;
          if (container.scrollTop > 0) return; // Only activate when at the top
    
    this.startY = event.touches[0].clientY;
    this.isPulling = true;
    this.pullDistance = 0;
  }

  private handleTouchMove(event: TouchEvent): void {
    if (!this.isPulling || this.isRefreshing) return;
    
    this.currentY = event.touches[0].clientY;
    const deltaY = this.currentY - this.startY;
    
    if (deltaY > 0) {
      event.preventDefault();
      this.pullDistance = Math.min(deltaY * 0.6, 150);
      this.updatePullIndicator(event.currentTarget as HTMLElement);
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    if (!this.isPulling) return;
    
    const container = event.currentTarget as HTMLElement;
    
    if (this.pullDistance >= 80) {
      this.triggerRefresh();
    }
    
    this.resetPullIndicator(container);
    this.isPulling = false;
    this.pullDistance = 0;
  }

  private handleMouseDown(event: MouseEvent): void {
    if (this.isRefreshing) return;
    
    const container = event.currentTarget as HTMLElement;
    if (container.scrollTop > 0) return;
    
    this.startY = event.clientY;
    this.isPulling = true;
    this.pullDistance = 0;
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isPulling || this.isRefreshing) return;
    
    this.currentY = event.clientY;
    const deltaY = this.currentY - this.startY;
    
    if (deltaY > 0) {
      event.preventDefault();
      this.pullDistance = Math.min(deltaY * 0.6, 150);
      this.updatePullIndicator(event.currentTarget as HTMLElement);
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    if (!this.isPulling) return;
    
    const container = event.currentTarget as HTMLElement;
    
    if (this.pullDistance >= 80) {
      this.triggerRefresh();
    }
    
    this.resetPullIndicator(container);
    this.isPulling = false;
    this.pullDistance = 0;
  }

  private updatePullIndicator(container: HTMLElement): void {
    let indicator = container.querySelector('.pull-to-refresh-indicator') as HTMLElement;
    
    if (!indicator) {
      indicator = this.createPullIndicator();
      container.appendChild(indicator);
    }
    
    const progress = Math.min(this.pullDistance / 80, 1);
    // Mantener el centrado horizontal mientras se mueve verticalmente
    indicator.style.transform = `translateX(-50%) translateY(${this.pullDistance}px)`;
    indicator.style.opacity = progress.toString();
    
    const spinner = indicator.querySelector('.spinner') as HTMLElement;
    if (spinner) {
      spinner.style.transform = `rotate(${progress * 360}deg)`;
    }
  }

  private resetPullIndicator(container: HTMLElement): void {
    const indicator = container.querySelector('.pull-to-refresh-indicator') as HTMLElement;
    if (indicator) {
      // Mantener el centrado horizontal al resetear
      indicator.style.transform = 'translateX(-50%) translateY(0px)';
      indicator.style.opacity = '0';
    }
  }

  private createPullIndicator(): HTMLElement {
    const indicator = document.createElement('div');
    indicator.className = 'pull-to-refresh-indicator';
    indicator.innerHTML = `
      <div class="refresh-container">
        <div class="spinner">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor" opacity="0.2"/>
            <path d="M12 4v2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 17.5V20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M4.93 4.93l1.77 1.77" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M17.3 17.3l1.77 1.77" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 12h2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M19.5 12H22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M4.93 19.07l1.77-1.77" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M17.3 6.7l1.77-1.77" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <span class="refresh-text">Desliza para actualizar</span>
      </div>
    `;
    
    indicator.style.cssText = `
      position: absolute;
      top: -80px;
      left: 50%;
      transform: translateX(-50%) translateY(0px);
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: 1000;
      pointer-events: none;
    `;
    
    const refreshContainer = indicator.querySelector('.refresh-container') as HTMLElement;
    refreshContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 16px 24px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
    `;
    
    const spinner = indicator.querySelector('.spinner') as HTMLElement;
    spinner.style.cssText = `
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s ease;
      color: #3b82f6;
    `;
    
    const svg = spinner.querySelector('svg') as unknown as HTMLElement;
    svg.style.cssText = `
      width: 100%;
      height: 100%;
    `;
    
    const text = indicator.querySelector('.refresh-text') as HTMLElement;
    text.style.cssText = `
      font-size: 13px;
      font-weight: 500;
      color: #6b7280;
      white-space: nowrap;
      text-align: center;
      letter-spacing: 0.025em;
    `;
    
    return indicator;
  }
} 