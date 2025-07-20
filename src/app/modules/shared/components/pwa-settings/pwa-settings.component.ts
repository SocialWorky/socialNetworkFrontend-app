import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

import { PwaUpdateService } from '@shared/services/pwa-update.service';
import { PwaInstallService } from '@shared/services/pwa-install.service';

@Component({
  selector: 'app-pwa-settings',
  standalone: false,
  template: `
    <ion-card>
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="settings-outline"></ion-icon>
          Configuración de PWA
        </ion-card-title>
      </ion-card-header>
      
      <ion-card-content>
        <div class="setting-item">
          <div class="setting-info">
            <h3>Actualización automática</h3>
            <p>La aplicación se actualizará automáticamente cuando haya una nueva versión disponible.</p>
          </div>
          <ion-toggle 
            [(ngModel)]="autoUpdateEnabled"
            (ionChange)="toggleAutoUpdate($event)"
            labelPlacement="end">
          </ion-toggle>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <h3>Estado de instalación</h3>
            <p>{{ isInstalled ? 'La aplicación está instalada' : 'La aplicación no está instalada' }}</p>
          </div>
          <ion-badge [color]="isInstalled ? 'success' : 'warning'">
            {{ isInstalled ? 'Instalada' : 'No instalada' }}
          </ion-badge>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <h3>Última verificación</h3>
            <p>{{ lastCheckTime ? 'Hace ' + getTimeAgo(lastCheckTime) : 'Nunca' }}</p>
          </div>
          <ion-button 
            fill="outline" 
            size="small"
            (click)="checkForUpdates()"
            [disabled]="isChecking">
            <ion-spinner *ngIf="isChecking" name="crescent"></ion-spinner>
            {{ isChecking ? 'Verificando...' : 'Verificar ahora' }}
          </ion-button>
        </div>

        <div class="setting-item" *ngIf="updateInfo">
          <div class="setting-info">
            <h3>Actualización disponible</h3>
            <p>Hay una nueva versión lista para instalar.</p>
          </div>
          <ion-button 
            color="primary"
            size="small"
            (click)="applyUpdate()"
            [disabled]="isUpdating">
            <ion-spinner *ngIf="isUpdating" name="crescent"></ion-spinner>
            {{ isUpdating ? 'Actualizando...' : 'Actualizar' }}
          </ion-button>
        </div>

        <div class="setting-item" *ngIf="!isInstalled && pwaSupported">
          <div class="setting-info">
            <h3>Instalar aplicación</h3>
            <p>Instala esta aplicación en tu dispositivo para una mejor experiencia.</p>
          </div>
          <ion-button 
            color="success"
            size="small"
            (click)="installPWA()">
            Instalar
          </ion-button>
        </div>
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .setting-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 0;
      border-bottom: 1px solid #eee;
    }

    .setting-item:last-child {
      border-bottom: none;
    }

    .setting-info {
      flex: 1;
      margin-right: 16px;
    }

    .setting-info h3 {
      margin: 0 0 4px 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .setting-info p {
      margin: 0;
      font-size: 0.875rem;
      color: #666;
    }

    ion-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `]
})
export class PwaSettingsComponent implements OnInit, OnDestroy {
  autoUpdateEnabled = false;
  isInstalled = false;
  pwaSupported = false;
  isChecking = false;
  isUpdating = false;
  lastCheckTime: Date | null = null;
  updateInfo: any = null;
  
  private destroy$ = new Subject<void>();

  constructor(
    private pwaUpdateService: PwaUpdateService,
    private pwaInstallService: PwaInstallService
  ) {}

  ngOnInit(): void {
    // Get automatic update status
    this.autoUpdateEnabled = this.pwaUpdateService.getAutoUpdateStatus();
    
    // Check if PWA is installed
    this.isInstalled = this.pwaInstallService.isAppInstalled();
    this.pwaSupported = this.pwaInstallService.isPwaSupported();

    // Suscribirse a las actualizaciones disponibles
    this.pwaUpdateService.updateAvailable
      .pipe(takeUntil(this.destroy$))
      .subscribe(updateInfo => {
        this.updateInfo = updateInfo.available ? updateInfo : null;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Cambia el estado de actualización automática
   */
  toggleAutoUpdate(event: any): void {
    this.pwaUpdateService.setAutoUpdate(event.detail.checked);
  }

  /**
   * Verifica manualmente si hay actualizaciones
   */
  async checkForUpdates(): Promise<void> {
    try {
      this.isChecking = true;
      this.lastCheckTime = new Date();
      await this.pwaUpdateService.checkForUpdates();
    } catch (error) {
      console.error('Error al verificar actualizaciones:', error);
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Aplica la actualización disponible
   */
  async applyUpdate(): Promise<void> {
    try {
      this.isUpdating = true;
      await this.pwaUpdateService.applyUpdate();
    } catch (error) {
      console.error('Error al aplicar la actualización:', error);
      this.isUpdating = false;
    }
  }

  /**
   * Instala la PWA
   */
  installPWA(): void {
    this.pwaInstallService.showInstallPrompt(
      'Instalar aplicación',
      '¿Deseas instalar esta aplicación en tu dispositivo?'
    );
  }

  /**
   * Calcula el tiempo transcurrido desde la última verificación
   */
  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'menos de 1 minuto';
    if (diffInMinutes < 60) return `${diffInMinutes} minutos`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} horas`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} días`;
  }
} 