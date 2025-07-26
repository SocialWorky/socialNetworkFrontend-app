import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

import { PwaUpdateService } from '@shared/services/pwa-update.service';
import { PwaInstallService } from '@shared/services/pwa-install.service';
import { translations } from '@translations/translations';

@Component({
  selector: 'app-pwa-settings',
  standalone: false,
  template: `
    <ion-card>
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="settings-outline"></ion-icon>
          {{ translations['pwa.settings.title'] }}
        </ion-card-title>
      </ion-card-header>
      
      <ion-card-content>
        <div class="setting-item">
          <div class="setting-info">
            <h3>{{ translations['pwa.settings.manualUpdate.title'] }}</h3>
            <p>{{ translations['pwa.settings.manualUpdate.description'] }}</p>
          </div>
          <ion-badge color="info">
            {{ translations['pwa.settings.manualUpdate.badge'] }}
          </ion-badge>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <h3>{{ translations['pwa.settings.installationStatus.title'] }}</h3>
            <p>{{ isInstalled ? translations['pwa.settings.installationStatus.installed'] : translations['pwa.settings.installationStatus.notInstalled'] }}</p>
          </div>
          <ion-badge [color]="isInstalled ? 'success' : 'warning'">
            {{ isInstalled ? translations['pwa.settings.installationStatus.badge.installed'] : translations['pwa.settings.installationStatus.badge.notInstalled'] }}
          </ion-badge>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <h3>{{ translations['pwa.settings.lastCheck.title'] }}</h3>
            <p>{{ lastCheckTime ? translations['pwa.settings.lastCheck.ago'] + ' ' + getTimeAgo(lastCheckTime) : translations['pwa.settings.lastCheck.never'] }}</p>
          </div>
          <ion-button 
            fill="outline" 
            size="small"
            (click)="checkForUpdates()"
            [disabled]="isChecking">
            <ion-spinner *ngIf="isChecking" name="crescent"></ion-spinner>
            {{ isChecking ? translations['pwa.settings.lastCheck.checking'] : translations['pwa.settings.lastCheck.button'] }}
          </ion-button>
        </div>

        <div class="setting-item" *ngIf="updateInfo">
          <div class="setting-info">
            <h3>{{ translations['pwa.settings.updateAvailable.title'] }}</h3>
            <p>{{ translations['pwa.settings.updateAvailable.description'] }}</p>
          </div>
          <ion-button 
            color="primary"
            size="small"
            (click)="applyUpdate()"
            [disabled]="isUpdating">
            <ion-spinner *ngIf="isUpdating" name="crescent"></ion-spinner>
            {{ isUpdating ? translations['pwa.settings.updateAvailable.updating'] : translations['pwa.settings.updateAvailable.button'] }}
          </ion-button>
        </div>

        <div class="setting-item" *ngIf="!isInstalled && pwaSupported">
          <div class="setting-info">
            <h3>{{ translations['pwa.settings.install.title'] }}</h3>
            <p>{{ translations['pwa.settings.install.description'] }}</p>
          </div>
          <ion-button 
            color="success"
            size="small"
            (click)="installPWA()">
            {{ translations['pwa.settings.install.button'] }}
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
  // autoUpdateEnabled removed - no automatic updates allowed
  isInstalled = false;
  pwaSupported = false;
  isChecking = false;
  isUpdating = false;
  lastCheckTime: Date | null = null;
  updateInfo: any = null;
  translations = translations;
  
  private destroy$ = new Subject<void>();

  constructor(
    private pwaUpdateService: PwaUpdateService,
    private pwaInstallService: PwaInstallService
  ) {}

  ngOnInit(): void {
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
   * Actualización automática no permitida
   */
  // toggleAutoUpdate method removed - no automatic updates allowed

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