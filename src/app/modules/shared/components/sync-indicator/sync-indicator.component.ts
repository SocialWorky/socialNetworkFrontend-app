import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { SmartSyncService, SyncStatus } from '@shared/services/smart-sync.service';

@Component({
  selector: 'worky-sync-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sync-indicator" *ngIf="showIndicator">
      <div class="sync-status" [class]="statusClass">
        <div class="sync-icon">
          <i class="fas" [class]="iconClass"></i>
        </div>
        <div class="sync-message">
          {{ statusMessage }}
        </div>
        <div class="sync-progress" *ngIf="syncStatus.isSyncing">
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sync-indicator {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      background: var(--worky-primary-color, #007bff);
      color: white;
      border-radius: 8px;
      padding: 12px 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      font-size: 14px;
      max-width: 300px;
      transition: all 0.3s ease;
    }

    .sync-status {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sync-icon {
      font-size: 16px;
    }

    .sync-message {
      flex: 1;
      font-weight: 500;
    }

    .sync-progress {
      width: 100%;
      margin-top: 8px;
    }

    .progress-bar {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 2px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: white;
      border-radius: 2px;
      animation: progress-animation 2s ease-in-out infinite;
    }

    @keyframes progress-animation {
      0% { width: 0%; }
      50% { width: 70%; }
      100% { width: 100%; }
    }

    .sync-status.syncing {
      background: var(--worky-warning-color, #ffc107);
    }

    .sync-status.error {
      background: var(--worky-danger-color, #dc3545);
    }

    .sync-status.success {
      background: var(--worky-success-color, #28a745);
    }

    .sync-status.offline {
      background: var(--worky-secondary-color, #6c757d);
    }

    .fas.fa-sync-alt {
      animation: spin 1s linear infinite;
    }

    .fas.fa-check-circle {
      color: #28a745;
    }

    .fas.fa-exclamation-triangle {
      color: #ffc107;
    }

    .fas.fa-times-circle {
      color: #dc3545;
    }

    .fas.fa-wifi-slash {
      color: #6c757d;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .sync-indicator {
        top: 10px;
        right: 10px;
        left: 10px;
        max-width: none;
      }
    }
  `]
})
export class SyncIndicatorComponent implements OnInit, OnDestroy {
  syncStatus: SyncStatus = {
    isSyncing: false,
    lastSync: null,
    error: null,
    pendingChanges: 0
  };

  showIndicator = false;
  private destroy$ = new Subject<void>();

  constructor(private smartSyncService: SmartSyncService) {}

  ngOnInit(): void {
    this.smartSyncService.getSyncStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.syncStatus = status;
        this.updateIndicatorVisibility();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get statusClass(): string {
    if (this.syncStatus.error) return 'error';
    if (this.syncStatus.isSyncing) return 'syncing';
    if (this.syncStatus.lastSync) return 'success';
    return 'offline';
  }

  get iconClass(): string {
    if (this.syncStatus.error) return 'fa-times-circle';
    if (this.syncStatus.isSyncing) return 'fa-sync-alt';
    if (this.syncStatus.lastSync) return 'fa-check-circle';
    return 'fa-wifi-slash';
  }

  get statusMessage(): string {
    if (this.syncStatus.error) {
      return 'Error de sincronización';
    }
    if (this.syncStatus.isSyncing) {
      return 'Sincronizando...';
    }
    if (this.syncStatus.lastSync) {
      const lastSyncDate = new Date(this.syncStatus.lastSync);
      const timeDiff = Date.now() - this.syncStatus.lastSync;
      const minutes = Math.floor(timeDiff / (1000 * 60));
      
      if (minutes < 1) {
        return 'Sincronizado hace un momento';
      } else if (minutes < 60) {
        return `Sincronizado hace ${minutes} min`;
      } else {
        const hours = Math.floor(minutes / 60);
        return `Sincronizado hace ${hours}h`;
      }
    }
    return 'Sin conexión';
  }

  private updateIndicatorVisibility(): void {
    // Mostrar indicador si hay actividad de sincronización o errores
    this.showIndicator = this.syncStatus.isSyncing || 
                        this.syncStatus.error !== null || 
                        this.syncStatus.pendingChanges > 0;

    // Ocultar indicador después de 3 segundos si no hay errores y no está sincronizando
    if (!this.syncStatus.isSyncing && !this.syncStatus.error && this.syncStatus.pendingChanges === 0) {
      setTimeout(() => {
        if (!this.syncStatus.isSyncing && !this.syncStatus.error && this.syncStatus.pendingChanges === 0) {
          this.showIndicator = false;
        }
      }, 3000);
    }
  }
} 