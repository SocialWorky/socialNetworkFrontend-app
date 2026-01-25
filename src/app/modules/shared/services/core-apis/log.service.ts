import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { Subject, takeUntil } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

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

  log(level: LevelLogEnum, context: string, message: string, metadata?: Record<string, any>, forceImmediate: boolean = false) {
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

      // Send logs immediately if limit reached or if forceImmediate is true (for critical errors)
      if (this._logs.length >= this.MAX_BATCH_SIZE || forceImmediate) {
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

  private isUserAuthenticated(): boolean {
    const token = localStorage.getItem('token');

    if (!token || token === 'undefined' || token === 'null') {
      return false;
    }

    try {
      const decodedToken: any = jwtDecode(token);
      const currentTime = Math.floor(Date.now() / 1000);

      if (!decodedToken || !decodedToken.exp || decodedToken.exp <= currentTime) {
        return false;
      }
    } catch (error) {
      return false;
    }

    return true;
  }

  private sendLogs() {
    if (this._logs.length === 0) {
      return;
    }

    const isAuthenticated = this.isUserAuthenticated();
    
    // Separate critical logs (errors) from regular logs
    const criticalLogs: any[] = [];
    const regularLogs: any[] = [];
    
    this._logs.forEach(log => {
      if (log.level === LevelLogEnum.ERROR) {
        criticalLogs.push(log);
      } else {
        regularLogs.push(log);
      }
    });

    // If not authenticated, keep critical logs for retry, discard regular logs
    if (!isAuthenticated) {
      // Keep critical logs for retry when user authenticates
      this._logs = criticalLogs;
      // Log to console for debugging (only in development)
      if (!environment.PRODUCTION && criticalLogs.length > 0) {
        console.warn('[LogService] User not authenticated. Critical logs queued for retry:', criticalLogs.length);
      }
      if (this._timer) {
        clearTimeout(this._timer);
        this._timer = null;
      }
      // Retry sending critical logs after a delay
      if (criticalLogs.length > 0) {
        this._timer = setTimeout(() => this.sendLogs(), 5000);
      }
      return;
    }

    const logsToSend = [...this._logs];
    this._logs = [];

    try {
      // Split into smaller batches if needed
      const batches = this.chunkArray(logsToSend, this.MAX_BATCH_SIZE);
      
      batches.forEach((batch, batchIndex) => {
        this.http.post(this._apiUrl, { logs: batch })
          .pipe(takeUntil(this._destroy$))
          .subscribe({
            next: () => {
              // Log successful - only log in development for debugging
              if (!environment.PRODUCTION) {
                console.debug(`[LogService] Successfully sent batch ${batchIndex + 1}/${batches.length} with ${batch.length} logs`);
              }
            },
            error: (error) => {
              // Log error details for debugging
              console.error('[LogService] Error sending logs to backend:', {
                status: error.status,
                statusText: error.statusText,
                message: error.message,
                url: error.url || this._apiUrl,
                batchSize: batch.length,
                batchIndex: batchIndex + 1,
                totalBatches: batches.length
              });

              // If 413 error, try with smaller batch
              if (error.status === 413 && batch.length > 1) {
                const smallerBatches = this.chunkArray(batch, Math.floor(batch.length / 2));
                smallerBatches.forEach(smallBatch => {
                  this.http.post(this._apiUrl, { logs: smallBatch })
                    .pipe(takeUntil(this._destroy$))
                    .subscribe({
                      next: () => {
                        if (!environment.PRODUCTION) {
                          console.debug('[LogService] Successfully sent smaller batch after 413 error');
                        }
                      },
                      error: (retryError) => {
                        console.error('[LogService] Error sending smaller batch:', retryError);
                        // Re-queue critical logs for retry
                        const criticalInBatch = smallBatch.filter((log: any) => log.level === LevelLogEnum.ERROR);
                        if (criticalInBatch.length > 0) {
                          this._logs.push(...criticalInBatch);
                          // Retry after delay
                          if (!this._timer) {
                            this._timer = setTimeout(() => this.sendLogs(), 10000);
                          }
                        }
                      }
                    });
                });
              } else {
                // For other errors, re-queue critical logs for retry
                const criticalInBatch = batch.filter((log: any) => log.level === LevelLogEnum.ERROR);
                if (criticalInBatch.length > 0) {
                  this._logs.push(...criticalInBatch);
                  // Retry after delay
                  if (!this._timer) {
                    this._timer = setTimeout(() => this.sendLogs(), 10000);
                  }
                  if (!environment.PRODUCTION) {
                    console.warn(`[LogService] Re-queued ${criticalInBatch.length} critical logs for retry`);
                  }
                }
              }
            }
          });
      });

    } catch (error) {
      console.error('[LogService] Exception while sending logs:', error);
      // Retry with smaller batches
      if (logsToSend.length > 1) {
      const smallerBatches = this.chunkArray(logsToSend, Math.floor(logsToSend.length / 2));
      smallerBatches.forEach(batch => {
        this._logs.push(...batch);
      });
    } else {
      // Re-queue critical logs
      const criticalInSend = logsToSend.filter((log: any) => log.level === LevelLogEnum.ERROR);
      if (criticalInSend.length > 0) {
        this._logs.push(...criticalInSend);
      }
    }
    } finally {
      // Reset timer only if no logs are queued for retry
      if (this._logs.length === 0 && this._timer) {
        clearTimeout(this._timer);
        this._timer = null;
      }
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Clear all pending logs from the queue
   * Useful when logs are deleted from backend and we want to prevent them from being sent
   */
  clearPendingLogs(): void {
    this._logs = [];
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    if (!environment.PRODUCTION) {
      console.debug('[LogService] Cleared all pending logs from queue');
    }
  }

  /**
   * Get the number of pending logs in the queue
   */
  getPendingLogsCount(): number {
    return this._logs.length;
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
    
    if (this._timer) {
      clearTimeout(this._timer);
    }
  }
}

