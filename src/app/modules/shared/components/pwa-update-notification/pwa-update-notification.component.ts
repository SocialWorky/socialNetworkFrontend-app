import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

import { PwaUpdateService, UpdateInfo } from '@shared/services/pwa-update.service';
import { environment } from '@env/environment';
import { translations } from '@translations/translations';

@Component({
  selector: 'app-pwa-update-notification',
  standalone: false,
  template: `
    <div *ngIf="showNotification" class="modal-backdrop" [class.show]="showNotification">
      <div class="modal-container" [class.show]="showNotification">
        <div class="modal-content">
          <div class="modal-header">
            <div class="header-icon">
              <ion-icon name="refresh-outline"></ion-icon>
            </div>
            <h2 class="modal-title">{{ translations['pwa.update.title'] }}</h2>
          </div>

          <div class="modal-body">
            <div class="update-message">
              <p>{{ translations['pwa.update.message'] }}</p>
              <p class="update-instruction">{{ translations['pwa.update.instruction'] }}</p>
            </div>

            <div class="update-info" *ngIf="updateInfo">
              <div class="info-item">
                <span class="label">{{ translations['pwa.update.currentVersion'] }}</span>
                <span class="value">{{ updateInfo.currentVersion | slice:0:8 }}...</span>
              </div>
              <div class="info-item">
                <span class="label">{{ translations['pwa.update.newVersion'] }}</span>
                <span class="value new-version">{{ updateInfo.newVersion | slice:0:8 }}...</span>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <ion-button 
              expand="block"
              (click)="applyUpdate()"
              [disabled]="isUpdating"
              class="update-button">
              <ion-spinner *ngIf="isUpdating" name="crescent"></ion-spinner>
              <ion-icon *ngIf="!isUpdating" name="download-outline"></ion-icon>
              {{ isUpdating ? translations['pwa.update.updating'] : translations['pwa.update.button'] }}
            </ion-button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease-in-out;
      pointer-events: auto;
    }

    .modal-backdrop.show {
      opacity: 1;
      visibility: visible;
    }

    .modal-container {
      width: 100%;
      max-width: 400px;
      margin: 20px;
      transform: scale(0.9) translateY(-10px);
      transition: all 0.3s ease-in-out;
    }

    .modal-container.show {
      transform: scale(1) translateY(0);
    }

    .modal-content {
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
      overflow: hidden;
    }

    .modal-header {
      background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
      color: white;
      padding: 24px 20px 20px;
      text-align: center;
    }

    .header-icon {
      width: 48px;
      height: 48px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 12px;
    }

    .header-icon ion-icon {
      font-size: 24px;
      color: white;
    }

    .modal-title {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: white;
    }

    .modal-body {
      padding: 20px;
    }

    .update-message {
      margin-bottom: 16px;
    }

    .update-message p {
      margin: 0;
      font-size: 15px;
      line-height: 1.5;
      color: #374151;
      text-align: center;
    }

    .update-instruction {
      margin-top: 8px !important;
      font-size: 14px !important;
      color: #6b7280 !important;
      font-weight: 500;
    }

    .update-info {
      background: #f9fafb;
      border-radius: 8px;
      padding: 12px;
      border: 1px solid #e5e7eb;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .info-item:last-child {
      margin-bottom: 0;
    }

    .label {
      font-weight: 500;
      color: #6b7280;
      font-size: 14px;
    }

    .value {
      font-weight: 600;
      color: #111827;
      font-size: 14px;
    }

    .new-version {
      color: #047857;
    }

    .modal-footer {
      padding: 0 20px 20px;
    }

    .update-button {
      --background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
      --color: white;
      --border-radius: 8px;
      --padding-top: 14px;
      --padding-bottom: 14px;
      font-weight: 600;
      font-size: 15px;
      height: 48px;
      --box-shadow: 0 4px 12px rgba(107, 114, 128, 0.2);
    }

    .update-button:hover {
      --box-shadow: 0 6px 16px rgba(107, 114, 128, 0.3);
    }

    .update-button ion-icon {
      margin-right: 6px;
    }

    @media (max-width: 480px) {
      .modal-container {
        margin: 16px;
        max-width: none;
      }

      .modal-header {
        padding: 20px 16px 16px;
      }

      .modal-body {
        padding: 16px;
      }

      .modal-footer {
        padding: 0 16px 16px;
      }

      .modal-title {
        font-size: 18px;
      }

      .header-icon {
        width: 40px;
        height: 40px;
      }

      .header-icon ion-icon {
        font-size: 20px;
      }
    }

    ion-spinner {
      --color: white;
    }

    :host-context(body.modal-open) {
      overflow: hidden;
    }

    /* Ensure modal is always on top and blocking */
    .modal-backdrop.show {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }

    /* Prevent any interaction with content behind modal */
    body.modal-open {
      overflow: hidden !important;
      position: fixed !important;
      width: 100% !important;
      height: 100% !important;
    }

    body.modal-open * {
      pointer-events: none !important;
    }

    body.modal-open .modal-backdrop,
    body.modal-open .modal-backdrop * {
      pointer-events: auto !important;
    }
  `]
})
export class PwaUpdateNotificationComponent implements OnInit, OnDestroy {
  showNotification = false;
  updateInfo: UpdateInfo | null = null;
  isUpdating = false;
  translations = translations;
  
  private destroy$ = new Subject<void>();

  constructor(private pwaUpdateService: PwaUpdateService) {}

  ngOnInit(): void {
    this.pwaUpdateService.updateAvailable
      .pipe(takeUntil(this.destroy$))
      .subscribe(updateInfo => {
        if (updateInfo.available) {
          this.updateInfo = updateInfo;
          this.showNotification = true;
          document.body.classList.add('modal-open');
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    document.body.classList.remove('modal-open');
  }

  async applyUpdate(): Promise<void> {
    try {
      this.isUpdating = true;
      
      // Handle simulated updates in development
      if (!environment.PRODUCTION && this.updateInfo?.currentVersion === 'abc12345') {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        return;
      }
      
      await this.pwaUpdateService.applyUpdate();
    } catch (error) {
      console.error('Error applying update:', error);
      this.isUpdating = false;
    }
  }


} 
