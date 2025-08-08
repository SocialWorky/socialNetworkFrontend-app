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

  private _destroy$ = new Subject<void>();

  // Configuration to avoid 413 errors
  private readonly MAX_BATCH_SIZE = 50;
  private readonly MAX_LOG_SIZE = 1000;
  private readonly BATCH_TIMEOUT = 15000;

  constructor(private http: HttpClient) {
    this._url = environment.API_URL;
    this._apiUrl = `${this._url}/records-logs/batch`;
  }

  log(level: LevelLogEnum, context: string, message: string, metadata?: Record<string, any>) {
    try {
      // Truncate message if too long
      const truncatedMessage = message.length > this.MAX_LOG_SIZE 
        ? message.substring(0, this.MAX_LOG_SIZE) + '...' 
        : message;

      // Clean metadata if too large
      const cleanMetadata = this.cleanMetadata(metadata);

      const logEntry = {
        level,
        context: context.substring(0, 100), // Limitar contexto a 100 caracteres
        message: `FRONT: ${truncatedMessage}`,
        metadata: cleanMetadata,
        timestamp: new Date().toISOString(),
      };

      this._logs.push(logEntry);

      // Send logs immediately if limit reached
      if (this._logs.length >= this.MAX_BATCH_SIZE) {
        this.sendLogs();
      } else if (!this._timer) {
        // Send logs after timeout
        this._timer = setTimeout(() => this.sendLogs(), this.BATCH_TIMEOUT);
      }
    } catch (error) {
      // Log processing error - handled by global error handler
    }
  }

  private cleanMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;

    const clean: Record<string, any> = {};
    const maxValueLength = 500;

    for (const [key, value] of Object.entries(metadata)) {
      try {
        if (typeof value === 'string' && value.length > maxValueLength) {
          clean[key] = value.substring(0, maxValueLength) + '...';
        } else if (typeof value === 'object' && value !== null) {
          // For objects, convert to string and truncate safely
          const stringValue = JSON.stringify(value);
          if (stringValue.length > maxValueLength) {
            clean[key] = stringValue.substring(0, maxValueLength) + '...';
          } else {
            clean[key] = value;
          }
        } else {
          clean[key] = value;
        }
      } catch (error) {
        // Replace with error message if processing fails
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
      // Split into smaller batches if needed
      const batches = this.chunkArray(logsToSend, this.MAX_BATCH_SIZE);
      
      batches.forEach(batch => {
        this.http.post(this._apiUrl, { logs: batch })
          .pipe(takeUntil(this._destroy$))
          .subscribe({
            next: () => {
              // Log successful
            },
            error: (error) => {
              // If 413 error, try with smaller batch
              if (error.status === 413 && batch.length > 1) {
                const smallerBatches = this.chunkArray(batch, Math.floor(batch.length / 2));
                smallerBatches.forEach(smallBatch => {
                  this.http.post(this._apiUrl, { logs: smallBatch })
                    .pipe(takeUntil(this._destroy$))
                    .subscribe();
                });
              } else {
                // Log sending error handled silently
              }
            }
          });
      });

    } catch (error) {
      // Retry with smaller batches
      if (logsToSend.length > 1) {
        const smallerBatches = this.chunkArray(logsToSend, Math.floor(logsToSend.length / 2));
        smallerBatches.forEach(batch => {
          this._logs.push(...batch);
        });
      } else {
        this._logs.push(...logsToSend);
      }
    } finally {
      // Reset timer
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
    this._destroy$.next();
    this._destroy$.complete();
    
    if (this._timer) {
      clearTimeout(this._timer);
    }
  }
}

