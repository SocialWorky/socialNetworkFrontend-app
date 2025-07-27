import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, timer } from 'rxjs';
import { ConnectionQualityService } from '../../services/connection-quality.service';
import { EnhancedLoggingService } from '../../services/enhanced-logging.service';
import { DeviceDetectionService } from '../../services/device-detection.service';
import { LevelLogEnum } from '../../services/core-apis/log.service';

@Component({
  selector: 'worky-network-status',
  template: `
    <div class="network-toast-container" *ngIf="showToast">
      <div class="network-toast" [class]="'quality-' + connectionInfo.quality">
        <div class="toast-content">
          <div class="toast-icon">
            <i class="fas fa-wifi" [class]="'quality-' + connectionInfo.quality"></i>
          </div>
          <div class="toast-message">
            <div class="toast-title">{{ getToastTitle() }}</div>
            <div class="toast-subtitle">{{ getToastSubtitle() }}</div>
          </div>
          <div class="toast-progress">
            <div class="progress-bar" [style.width.%]="progressPercentage"></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .network-toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      max-width: 350px;
      pointer-events: none;
    }

    .network-toast {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      padding: 16px;
      border-left: 4px solid;
      animation: toastSlideIn 0.4s ease-out;
      position: relative;
      overflow: hidden;
    }

    .network-toast.quality-slow {
      border-left-color: #dc3545;
    }

    .network-toast.quality-medium {
      border-left-color: #ffc107;
    }

    .network-toast.quality-fast {
      border-left-color: #28a745;
    }

    .toast-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .toast-icon {
      flex-shrink: 0;
    }

    .toast-icon i {
      font-size: 1.2rem;
    }

    .toast-icon i.quality-slow {
      color: #dc3545;
    }

    .toast-icon i.quality-medium {
      color: #ffc107;
    }

    .toast-icon i.quality-fast {
      color: #28a745;
    }

    .toast-message {
      flex: 1;
      min-width: 0;
    }

    .toast-title {
      font-weight: 600;
      font-size: 0.9rem;
      color: #212529;
      margin-bottom: 2px;
      line-height: 1.2;
    }

    .toast-subtitle {
      font-size: 0.8rem;
      color: #6c757d;
      line-height: 1.2;
    }

    .toast-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 0 0 12px 12px;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #007bff, #0056b3);
      border-radius: 0 0 12px 12px;
      transition: width 0.1s linear;
    }

    .network-toast.quality-slow .progress-bar {
      background: linear-gradient(90deg, #dc3545, #c82333);
    }

    .network-toast.quality-medium .progress-bar {
      background: linear-gradient(90deg, #ffc107, #e0a800);
    }

    .network-toast.quality-fast .progress-bar {
      background: linear-gradient(90deg, #28a745, #1e7e34);
    }

    @keyframes toastSlideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes toastSlideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }

    .network-toast.toast-exit {
      animation: toastSlideOut 0.3s ease-in forwards;
    }

    @media (max-width: 768px) {
      .network-toast-container {
        top: 10px;
        right: 10px;
        left: 10px;
        max-width: none;
      }

      .network-toast {
        padding: 14px;
      }

      .toast-title {
        font-size: 0.85rem;
      }

      .toast-subtitle {
        font-size: 0.75rem;
      }
    }
  `],
  standalone: true,
  imports: [CommonModule]
})
export class NetworkStatusComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  showToast = false;
  progressPercentage = 100;
  
  connectionInfo: any = {
    quality: 'fast',
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false
  };

  private toastDuration = 5000; // 5 segundos
  private progressInterval: any;
  private autoOptimizeEnabled = false;

  constructor(
    private connectionQualityService: ConnectionQualityService,
    private enhancedLoggingService: EnhancedLoggingService,
    private deviceDetectionService: DeviceDetectionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.connectionQualityService.connection$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(connectionInfo => {
      this.connectionInfo = connectionInfo;
      
      // Solo mostrar toast para conexiones lentas y si no se ha optimizado ya
      if (connectionInfo.quality === 'slow' && !this.autoOptimizeEnabled) {
        this.showNetworkToast();
      }
      
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearProgressInterval();
  }

  private showNetworkToast(): void {
    // Verificar si ya se han aplicado optimizaciones
    const optimizationApplied = localStorage.getItem('networkOptimization') === 'enabled';
    
    if (optimizationApplied) {
      this.autoOptimizeEnabled = true;
      return;
    }

    this.showToast = true;
    this.progressPercentage = 100;
    this.cdr.markForCheck();

    // Aplicar optimizaciones automáticamente después de 1 segundo
    timer(1000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.applyAutomaticOptimizations();
    });

    // Iniciar barra de progreso
    this.startProgressBar();

    // Ocultar toast después del tiempo especificado
    timer(this.toastDuration).pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.hideToast();
    });

    this.enhancedLoggingService.logConnectionChange(
      'NetworkStatusComponent',
      'Slow connection detected, showing automatic optimization toast',
      'unknown',
      this.connectionInfo.quality
    );
  }

  private startProgressBar(): void {
    this.clearProgressInterval();
    
    const startTime = Date.now();
    const endTime = startTime + this.toastDuration;
    
    this.progressInterval = setInterval(() => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const remaining = Math.max(0, this.toastDuration - elapsed);
      
      this.progressPercentage = (remaining / this.toastDuration) * 100;
      this.cdr.markForCheck();
      
      if (remaining <= 0) {
        this.clearProgressInterval();
      }
    }, 50); // Actualizar cada 50ms para una animación suave
  }

  private clearProgressInterval(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  private hideToast(): void {
    this.showToast = false;
    this.clearProgressInterval();
    this.cdr.markForCheck();
  }

  private applyAutomaticOptimizations(): void {
    // Aplicar optimizaciones automáticamente
    localStorage.setItem('networkOptimization', 'enabled');
    localStorage.setItem('imageQuality', 'low');
    localStorage.setItem('progressiveLoading', 'enabled');
    localStorage.setItem('autoOptimized', 'true');
    
    this.autoOptimizeEnabled = true;
    
    this.enhancedLoggingService.logWithEnhancedMetadata(
      LevelLogEnum.INFO,
      'NetworkStatusComponent',
      'Automatic slow connection optimization applied',
      {
        optimization: 'enabled',
        imageQuality: 'low',
        progressiveLoading: 'enabled',
        autoOptimized: true,
        connectionQuality: this.connectionInfo.quality,
        downlink: this.connectionInfo.downlink,
        rtt: this.connectionInfo.rtt
      }
    );
  }

  getToastTitle(): string {
    return 'Conexión lenta detectada';
  }

  getToastSubtitle(): string {
    return 'Optimizando automáticamente para mejor rendimiento...';
  }
} 