import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of, switchMap, map, catchError, filter, tap } from 'rxjs';
import { LogService, LevelLogEnum } from './core-apis/log.service';
import { PublicationDatabaseService } from './database/publication-database.service';
import { PublicationView } from '@shared/interfaces/publicationView.interface';
import { NetworkService } from './network.service';

export interface SyncResult {
  hasChanges: boolean;
  updatedPublications: PublicationView[];
  newPublications: PublicationView[];
  updatedCount: number;
  syncTimestamp: number;
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSync: number | null;
  error: string | null;
  pendingChanges: number;
}

@Injectable({
  providedIn: 'root'
})
export class SmartSyncService {
  private syncStatus = new BehaviorSubject<SyncStatus>({
    isSyncing: false,
    lastSync: null,
    error: null,
    pendingChanges: 0
  });

  private syncInProgress = false;
  private syncQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  constructor(
    private logService: LogService,
    private publicationDatabase: PublicationDatabaseService,
    private networkService: NetworkService
  ) {
    this.initializeService();
  }

  private initializeService(): void {
    // Monitorear cambios de conexión para sincronización automática
    this.networkService.connectionStatus.subscribe(isOnline => {
      if (isOnline && this.syncStatus.value.pendingChanges > 0) {
        this.triggerSync();
      }
    });
  }

  /**
   * Obtiene el estado actual de sincronización
   */
  getSyncStatus(): Observable<SyncStatus> {
    return this.syncStatus.asObservable();
  }

  /**
   * Carga datos con sincronización inteligente
   * 1. Carga inmediatamente datos locales si existen
   * 2. Sincroniza en segundo plano si hay conexión
   * 3. Actualiza la UI cuando hay cambios
   */
  loadWithSmartSync<T>(
    localDataLoader: () => Promise<T>,
    serverDataLoader: () => Observable<T>,
    dataUpdater: (data: T) => void,
    options: {
      enableBackgroundSync?: boolean;
      syncOnConnection?: boolean;
      maxRetries?: number;
    } = {}
  ): Observable<T> {
    const {
      enableBackgroundSync = true,
      syncOnConnection = true,
      maxRetries = 3
    } = options;

    return from(localDataLoader()).pipe(
      switchMap(localData => {
        // Si hay datos locales, retornarlos inmediatamente
        if (localData && this.hasData(localData)) {
          this.logService.log(LevelLogEnum.INFO, 'SmartSyncService', 'Datos locales cargados inmediatamente');
          
          // Sincronizar en segundo plano si está habilitado
          if (enableBackgroundSync) {
            this.queueBackgroundSync(serverDataLoader, dataUpdater, maxRetries);
          }
          
          return of(localData);
        } else {
          // Si no hay datos locales, cargar del servidor
          this.logService.log(LevelLogEnum.INFO, 'SmartSyncService', 'Cargando datos del servidor');
          return serverDataLoader().pipe(
            tap(serverData => {
              if (serverData && this.hasData(serverData)) {
                dataUpdater(serverData);
              }
            })
          );
        }
      }),
      catchError(error => {
        this.logService.log(LevelLogEnum.ERROR, 'SmartSyncService', 'Error en carga inteligente', { error });
        throw error;
      })
    );
  }

  /**
   * Sincroniza publicaciones específicas
   */
  syncPublications(publicationIds: string[]): Observable<SyncResult> {
    if (publicationIds.length === 0) {
      return of({
        hasChanges: false,
        updatedPublications: [],
        newPublications: [],
        updatedCount: 0,
        syncTimestamp: Date.now()
      });
    }

    this.updateSyncStatus({ isSyncing: true, error: null });

    return from(this.publicationDatabase.syncSpecificPublications(publicationIds)).pipe(
      map(updatedPublications => {
        const result: SyncResult = {
          hasChanges: updatedPublications.length > 0,
          updatedPublications,
          newPublications: updatedPublications,
          updatedCount: updatedPublications.length,
          syncTimestamp: Date.now()
        };

        this.updateSyncStatus({
          isSyncing: false,
          lastSync: Date.now(),
          pendingChanges: 0
        });

        this.logService.log(LevelLogEnum.INFO, 'SmartSyncService', 'Sincronización completada', {
          updatedCount: result.updatedCount
        });

        return result;
      }),
      catchError(error => {
        this.updateSyncStatus({
          isSyncing: false,
          error: error.message
        });

        this.logService.log(LevelLogEnum.ERROR, 'SmartSyncService', 'Error en sincronización', { error });
        throw error;
      })
    );
  }

  /**
   * Fuerza una sincronización completa
   */
  forceSync(): Observable<SyncResult> {
    if (this.syncInProgress) {
      return of({
        hasChanges: false,
        updatedPublications: [],
        newPublications: [],
        updatedCount: 0,
        syncTimestamp: Date.now()
      });
    }

    this.syncInProgress = true;
    this.updateSyncStatus({ isSyncing: true, error: null });

    return from(this.publicationDatabase.getAllPublications()).pipe(
      switchMap(localPublications => {
        // Aquí implementarías la lógica de sincronización con el servidor
        // Por ahora, simulamos una sincronización exitosa
        return of({
          hasChanges: false,
          updatedPublications: localPublications,
          newPublications: [],
          updatedCount: 0,
          syncTimestamp: Date.now()
        });
      }),
      tap(result => {
        this.syncInProgress = false;
        this.updateSyncStatus({
          isSyncing: false,
          lastSync: Date.now(),
          pendingChanges: 0
        });
      }),
      catchError(error => {
        this.syncInProgress = false;
        this.updateSyncStatus({
          isSyncing: false,
          error: error.message
        });
        throw error;
      })
    );
  }

  /**
   * Cola una sincronización en segundo plano
   */
  private queueBackgroundSync<T>(
    serverDataLoader: () => Observable<T>,
    dataUpdater: (data: T) => void,
    maxRetries: number
  ): void {
    const syncTask = async () => {
      try {
        const serverData = await serverDataLoader().toPromise();
        if (serverData && this.hasData(serverData)) {
          dataUpdater(serverData);
          this.logService.log(LevelLogEnum.INFO, 'SmartSyncService', 'Sincronización en segundo plano completada');
        }
      } catch (error) {
        this.logService.log(LevelLogEnum.ERROR, 'SmartSyncService', 'Error en sincronización en segundo plano', { error });
      }
    };

    this.syncQueue.push(syncTask);
    this.processQueue();
  }

  /**
   * Procesa la cola de sincronización
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.syncQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.syncQueue.length > 0) {
      const task = this.syncQueue.shift();
      if (task) {
        await task();
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Dispara una sincronización manual
   */
  triggerSync(): void {
    if (!this.syncInProgress) {
      this.forceSync().subscribe();
    }
  }

  /**
   * Verifica si los datos tienen contenido
   */
  private hasData(data: any): boolean {
    if (Array.isArray(data)) {
      return data.length > 0;
    }
    if (typeof data === 'object' && data !== null) {
      return Object.keys(data).length > 0;
    }
    return !!data;
  }

  /**
   * Actualiza el estado de sincronización
   */
  private updateSyncStatus(updates: Partial<SyncStatus>): void {
    this.syncStatus.next({
      ...this.syncStatus.value,
      ...updates
    });
  }

  /**
   * Limpia el estado de sincronización
   */
  clearSyncStatus(): void {
    this.syncStatus.next({
      isSyncing: false,
      lastSync: null,
      error: null,
      pendingChanges: 0
    });
  }
} 