import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MediaCacheService, MediaCacheOptions } from '../../services/media-cache.service';
import { ConnectionQualityService } from '../../services/connection-quality.service';
import { LogService, LevelLogEnum } from '../../services/core-apis/log.service';

@Component({
  selector: 'worky-optimized-video',
  template: `
    <div class="video-container" [class.loading]="isLoading" [class.error]="hasError">
      <div class="loading-spinner" *ngIf="isLoading">
        <div class="spinner"></div>
        <div class="loading-text" *ngIf="isSlowConnection">
          <small>Loading on slow connection...</small>
        </div>
      </div>
      
      <video
        *ngIf="!hasError"
        #videoElement
        [src]="videoUrl"
        [poster]="posterUrl"
        [controls]="controls"
        [autoplay]="autoplay"
        [muted]="muted"
        [loop]="loop"
        [preload]="preload"
        [class.loaded]="!isLoading"
        [class.low-quality]="isLowQuality"
        (loadstart)="onLoadStart()"
        (canplay)="onCanPlay()"
        (error)="onVideoError()"
        [style.display]="isLoading ? 'none' : 'block'"
      ></video>
      
      <div class="error-placeholder" *ngIf="hasError">
        <i class="material-icons">video_library</i>
        <span>Video not available</span>
        <button *ngIf="canRetry" (click)="retryLoad()" class="retry-button">
          <i class="material-icons">refresh</i>
          Retry
        </button>
      </div>

      <div class="quality-indicator" *ngIf="showQualityIndicator && isLowQuality">
        <i class="material-icons">signal_cellular_alt</i>
        <span>Data saving mode</span>
      </div>

      <div class="play-button-overlay" *ngIf="!isLoading && !hasError && !controls">
        <button (click)="playVideo()" class="play-button">
          <i class="material-icons">play_arrow</i>
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./optimized-video.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule]
})
export class OptimizedVideoComponent implements OnInit, OnDestroy {
  @Input() src!: string;
  @Input() poster?: string;
  @Input() controls: boolean = true;
  @Input() autoplay: boolean = false;
  @Input() muted: boolean = false;
  @Input() loop: boolean = false;
  @Input() preload: 'none' | 'metadata' | 'auto' = 'metadata';
  @Input() options: MediaCacheOptions = {};
  @Input() showQualityIndicator: boolean = true;
  @Input() fallbackSrc: string = '/assets/img/shared/video-error.png';

  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;

  videoUrl: string = '';
  posterUrl: string = '';
  isLoading: boolean = true;
  hasError: boolean = false;
  isLowQuality: boolean = false;
  isSlowConnection: boolean = false;
  canRetry: boolean = false;
  retryCount: number = 0;
  private readonly MAX_RETRIES = 3;

  private destroy$ = new Subject<void>();

  constructor(
    private mediaCacheService: MediaCacheService,
    private connectionQualityService: ConnectionQualityService,
    private logService: LogService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.src) {
      this.setError();
      return;
    }

    this.setupConnectionMonitoring();
    this.loadVideo();
  }

  private setupConnectionMonitoring(): void {
    this.connectionQualityService.getConnectionQuality().pipe(
      takeUntil(this.destroy$)
    ).subscribe(quality => {
      this.isSlowConnection = quality === 'slow';
      this.isLowQuality = quality === 'slow';
      this.cdr.markForCheck();
    });
  }

  private loadVideo(): void {
    this.isLoading = true;
    this.hasError = false;
    this.canRetry = false;
    this.cdr.markForCheck();

    const connectionOptions = this.connectionQualityService.getOptimizedMediaOptions();
    const finalOptions: MediaCacheOptions = {
      ...connectionOptions,
      ...this.options
    };

    const qualityMap = { low: 'slow', medium: 'medium', high: 'fast' } as const;
    const optimizedUrl = this.mediaCacheService.getOptimizedUrl(this.src, qualityMap[connectionOptions.quality]);

    this.mediaCacheService.loadMedia(optimizedUrl, finalOptions).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (url) => {
        this.videoUrl = url;
        this.isLoading = false;
        this.hasError = false;
        this.isLowQuality = finalOptions.quality === 'low';
        this.retryCount = 0;
        this.cdr.markForCheck();

        this.logService.log(LevelLogEnum.INFO, 'OptimizedVideoComponent', 'Video loaded successfully', {
          originalUrl: this.src,
          optimizedUrl,
          quality: finalOptions.quality,
          connectionQuality: this.connectionQualityService.getConnectionInfo().quality
        });
      },
      error: (error) => {
        this.logService.log(LevelLogEnum.ERROR, 'OptimizedVideoComponent', 'Failed to load video', {
          url: this.src,
          error: error.message,
          retryCount: this.retryCount
        });

        if (this.retryCount < this.MAX_RETRIES) {
          this.retryCount++;
          this.canRetry = true;
          this.cdr.markForCheck();
        } else {
          this.setError();
        }
      }
    });

    if (this.poster) {
      this.loadPoster();
    }
  }

  private loadPoster(): void {
    const connectionOptions = this.connectionQualityService.getOptimizedMediaOptions();
    const qualityMap = { low: 'slow', medium: 'medium', high: 'fast' } as const;
    const optimizedPosterUrl = this.mediaCacheService.getOptimizedUrl(this.poster!, qualityMap[connectionOptions.quality]);

    this.mediaCacheService.loadMedia(optimizedPosterUrl, { quality: 'low' }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (url) => {
        this.posterUrl = url;
        this.cdr.markForCheck();
      },
      error: () => {
        this.posterUrl = this.poster!;
      }
    });
  }

  retryLoad(): void {
    if (this.canRetry && this.retryCount < this.MAX_RETRIES) {
      this.loadVideo();
    }
  }

  playVideo(): void {
    if (this.videoElement && this.videoElement.nativeElement) {
      this.videoElement.nativeElement.play();
    }
  }

  private setError(): void {
    this.videoUrl = this.fallbackSrc;
    this.isLoading = false;
    this.hasError = true;
    this.canRetry = false;
    this.cdr.markForCheck();
  }

  onLoadStart(): void {
    this.isLoading = true;
    this.cdr.markForCheck();
  }

  onCanPlay(): void {
    this.isLoading = false;
    this.hasError = false;
    this.cdr.markForCheck();
  }

  onVideoError(): void {
    if (this.videoUrl !== this.fallbackSrc) {
      this.setError();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
} 