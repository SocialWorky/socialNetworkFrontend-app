import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

import { PwaUpdateService, UpdateInfo } from '@shared/services/pwa-update.service';

@Component({
  selector: 'app-pwa-update-notification',
  standalone: false,
  template: `
    <div *ngIf="showNotification" class="update-notification" [class.show]="showNotification">
      <ion-card class="update-card">
        <ion-card-header>
          <ion-card-title>
            <ion-icon name="refresh-outline"></ion-icon>
            Nueva versión disponible
          </ion-card-title>
        </ion-card-header>
        
        <ion-card-content>
          <p>Se ha detectado una nueva versión de la aplicación.</p>
          
          <div class="version-info" *ngIf="updateInfo">
            <small>
              <strong>Versión actual:</strong> {{ updateInfo.currentVersion | slice:0:8 }}...<br>
              <strong>Nueva versión:</strong> {{ updateInfo.newVersion | slice:0:8 }}...
            </small>
          </div>

          <div class="auto-update-toggle">
            <ion-toggle 
              [(ngModel)]="autoUpdateEnabled"
              (ionChange)="toggleAutoUpdate($event)"
              labelPlacement="end">
              Actualización automática
            </ion-toggle>
          </div>
        </ion-card-content>

        <ion-card-content class="action-buttons">
          <ion-button 
            fill="outline" 
            (click)="dismiss()"
            class="dismiss-btn">
            Más tarde
          </ion-button>
          
          <ion-button 
            (click)="applyUpdate()"
            [disabled]="isUpdating"
            class="update-btn">
            <ion-spinner *ngIf="isUpdating" name="crescent"></ion-spinner>
            {{ isUpdating ? 'Actualizando...' : 'Actualizar ahora' }}
          </ion-button>
        </ion-card-content>
      </ion-card>
    </div>
  `,
  styles: [`
    .update-notification {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      max-width: 400px;
      transform: translateX(100%);
      transition: transform 0.3s ease-in-out;
    }

    .update-notification.show {
      transform: translateX(0);
    }

    .update-card {
      margin: 0;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }

    .update-card ion-card-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px 12px 0 0;
    }

    .update-card ion-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .version-info {
      background: #f8f9fa;
      padding: 8px 12px;
      border-radius: 6px;
      margin: 12px 0;
    }

    .auto-update-toggle {
      margin: 16px 0;
    }

    .action-buttons {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding-top: 0;
    }

    .dismiss-btn {
      --color: #6c757d;
      --border-color: #6c757d;
    }

    .update-btn {
      --background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    @media (max-width: 768px) {
      .update-notification {
        top: 10px;
        right: 10px;
        left: 10px;
        max-width: none;
      }
      
      .action-buttons {
        flex-direction: column;
      }
    }
  `]
})
export class PwaUpdateNotificationComponent implements OnInit, OnDestroy {
  showNotification = false;
  updateInfo: UpdateInfo | null = null;
  autoUpdateEnabled = false;
  isUpdating = false;
  
  private destroy$ = new Subject<void>();

  constructor(private pwaUpdateService: PwaUpdateService) {}

  ngOnInit(): void {
    this.pwaUpdateService.updateAvailable
      .pipe(takeUntil(this.destroy$))
      .subscribe(updateInfo => {
        if (updateInfo.available) {
          this.updateInfo = updateInfo;
          this.showNotification = true;
        }
      });

    this.autoUpdateEnabled = this.pwaUpdateService.getAutoUpdateStatus();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async applyUpdate(): Promise<void> {
    try {
      this.isUpdating = true;
      await this.pwaUpdateService.applyUpdate();
    } catch (error) {
      console.error('Error al aplicar la actualización:', error);
      this.isUpdating = false;
    }
  }

  dismiss(): void {
    this.showNotification = false;
  }

  toggleAutoUpdate(event: any): void {
    this.pwaUpdateService.setAutoUpdate(event.detail.checked);
  }
} 
