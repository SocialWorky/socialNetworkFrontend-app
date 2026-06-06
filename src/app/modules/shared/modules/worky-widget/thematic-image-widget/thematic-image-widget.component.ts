import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ThematicImageService, ThematicImage } from './service/thematic-image.service';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';
import { UtilityService } from '@shared/services/utility.service';
import { environment } from '@env/environment';
import { Subject, interval } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'worky-thematic-image',
  templateUrl: './thematic-image-widget.component.html',
  styleUrls: ['./thematic-image-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ThematicImageWidgetComponent implements OnInit, OnDestroy {
  images: ThematicImage[] = [];
  currentIndex = 0;
  loading = true;
  isPaused = false;
  private destroy$ = new Subject<void>();
  private slideInterval$?: any;

  constructor(
    private thematicImageService: ThematicImageService,
    private cdr: ChangeDetectorRef,
    private logService: LogService,
    private utilityService: UtilityService
  ) {}

  ngOnInit(): void {
    this.loadImages();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopSlide();
  }

  loadImages(): void {
    this.thematicImageService.getActiveForToday().pipe(
      catchError(error => {
        this.logService.log(
          LevelLogEnum.ERROR,
          'ThematicImageWidgetComponent',
          'Error loading thematic images',
          { error }
        );
        return of([]);
      })
    ).subscribe(images => {
      this.images = images;
      this.loading = false;
      // Reset current index when images change
      this.currentIndex = 0;
      // Always stop slide first, then start if needed
      this.stopSlide();
      if (this.images.length > 1) {
        this.startSlide();
      }
      // Force change detection to ensure the view updates
      this.cdr.detectChanges();
    });
  }

  startSlide(): void {
    // Only start sliding if there are 2 or more images
    if (this.images.length <= 1) {
      this.stopSlide();
      return;
    }

    const currentImage = this.images[this.currentIndex];
    const duration = (currentImage?.slideDuration || 5) * 1000;

    this.stopSlide();
    
    this.slideInterval$ = interval(duration)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.isPaused) {
          this.nextImage();
        }
      });
  }

  stopSlide(): void {
    if (this.slideInterval$) {
      this.slideInterval$.unsubscribe();
      this.slideInterval$ = null;
    }
  }

  nextImage(): void {
    if (this.images.length > 0) {
      this.currentIndex = (this.currentIndex + 1) % this.images.length;
      this.cdr.markForCheck();
      this.restartSlide();
    }
  }

  previousImage(): void {
    if (this.images.length > 0) {
      this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
      this.cdr.markForCheck();
      this.restartSlide();
    }
  }

  goToImage(index: number): void {
    if (index >= 0 && index < this.images.length) {
      this.currentIndex = index;
      this.cdr.markForCheck();
      this.restartSlide();
    }
  }

  restartSlide(): void {
    this.stopSlide();
    if (!this.isPaused) {
      this.startSlide();
    }
  }

  onMouseEnter(): void {
    this.isPaused = true;
    this.stopSlide();
    this.cdr.markForCheck();
  }

  onMouseLeave(): void {
    this.isPaused = false;
    if (this.images.length > 1) {
      this.startSlide();
    }
    this.cdr.markForCheck();
  }

  onImageClick(image: ThematicImage): void {
    if (image.redirectUrl) {
      window.open(image.redirectUrl, '_blank', 'noopener,noreferrer');
    }
  }

  getCurrentImage(): ThematicImage | null {
    return this.images.length > 0 ? this.images[this.currentIndex] : null;
  }

  /**
   * Get normalized image URL for display
   */
  getNormalizedImageUrl(imageUrl: string): string {
    if (!imageUrl) return '';
    return this.utilityService.normalizeImageUrl(imageUrl, environment.MINIO_BUCKET_URL || '');
  }
}
