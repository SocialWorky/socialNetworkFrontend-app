import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { Subject, takeUntil } from 'rxjs';

export enum LevelLogEnum {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

@Injectable({
  providedIn: 'root'
})
export class LogService {
  private _url: string;
  private _apiUrl: string;
  private _logs: any[] = [];
  private _timer: NodeJS.Timeout | null = null;
  private destroy$ = new Subject<void>();

  // Configuración para evitar errores 413
  private readonly MAX_BATCH_SIZE = 50; // Máximo 50 logs por batch
  private readonly MAX_LOG_SIZE = 1000; // Máximo 1000 caracteres por log
  private readonly BATCH_TIMEOUT = 15000; // 15 segundos en lugar de 30

  constructor(private http: HttpClient) {
    this._url = environment.API_URL;
    this._apiUrl = `${this._url}/records-logs/batch`;
  }

  log(level: LevelLogEnum, context: string, message: string, metadata?: Record<string, any>) {
    try {
      // Truncar mensaje si es muy largo
      const truncatedMessage = message.length > this.MAX_LOG_SIZE 
        ? message.substring(0, this.MAX_LOG_SIZE) + '...' 
        : message;

      // Limpiar metadata si es muy grande
      const cleanMetadata = this.cleanMetadata(metadata);

      const logEntry = {
        level,
        context: context.substring(0, 100), // Limitar contexto a 100 caracteres
        message: `FRONT: ${truncatedMessage}`,
        metadata: cleanMetadata,
        timestamp: new Date().toISOString(),
      };

      this._logs.push(logEntry);

      // Enviar logs inmediatamente si alcanzamos el límite
      if (this._logs.length >= this.MAX_BATCH_SIZE) {
        this.sendLogs();
      } else if (!this._timer) {
        // Enviar logs después del timeout
        this._timer = setTimeout(() => this.sendLogs(), this.BATCH_TIMEOUT);
      }
    } catch (error) {
      // Si hay error al procesar el log, lo registramos en consola para debugging
      console.error('Error processing log entry:', {
        level,
        context,
        message: message.substring(0, 200),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private cleanMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;

    const clean: Record<string, any> = {};
    const maxValueLength = 500; // Máximo 500 caracteres por valor

    for (const [key, value] of Object.entries(metadata)) {
      try {
        if (typeof value === 'string' && value.length > maxValueLength) {
          clean[key] = value.substring(0, maxValueLength) + '...';
        } else if (typeof value === 'object' && value !== null) {
          // Para objetos, convertir a string y truncar de forma segura
          const stringValue = JSON.stringify(value);
          if (stringValue.length > maxValueLength) {
            // En lugar de intentar parsear un JSON truncado, guardamos el string truncado
            clean[key] = stringValue.substring(0, maxValueLength) + '...';
          } else {
            clean[key] = value;
          }
        } else {
          clean[key] = value;
        }
      } catch (error) {
        // Si hay error al procesar un valor, lo reemplazamos con un mensaje de error
        clean[key] = `[Error processing value: ${error instanceof Error ? error.message : 'Unknown error'}]`;
      }
    }

    return clean;
  }

  private sendLogs() {
    if (this._logs.length === 0) return;

    const logsToSend = [...this._logs];
    this._logs = [];

    try {
      // Dividir en batches más pequeños si es necesario
      const batches = this.chunkArray(logsToSend, this.MAX_BATCH_SIZE);
      
      batches.forEach(batch => {
        this.http.post(this._apiUrl, { logs: batch })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              // Log exitoso
            },
            error: (error) => {
              // Si hay error 413, intentar con batch más pequeño
              if (error.status === 413 && batch.length > 1) {
                const smallerBatches = this.chunkArray(batch, Math.floor(batch.length / 2));
                smallerBatches.forEach(smallBatch => {
                  this.http.post(this._apiUrl, { logs: smallBatch })
                    .pipe(takeUntil(this.destroy$))
                    .subscribe();
                });
              } else {
                console.warn('Error sending logs:', error);
              }
            }
          });
      });

    } catch (error) {
      console.error('Error al enviar logs:', error);
      // Reintentar con logs más pequeños
      if (logsToSend.length > 1) {
        const smallerBatches = this.chunkArray(logsToSend, Math.floor(logsToSend.length / 2));
        smallerBatches.forEach(batch => {
          this._logs.push(...batch);
        });
      } else {
        this._logs.push(...logsToSend);
      }
    } finally {
      // Reset the timer
      this._timer = null;
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this._timer) {
      clearTimeout(this._timer);
    }
  }
}
