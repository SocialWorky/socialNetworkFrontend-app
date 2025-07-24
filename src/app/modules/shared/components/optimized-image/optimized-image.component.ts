import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Subject, takeUntil, BehaviorSubject } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ImageService, ImageLoadOptions } from '../../services/image.service';

@Component({
  selector: 'worky-optimized-image',
  template: `
    <div class="image-container" [class.loading]="isLoading">
      <div class="loading-spinner" *ngIf="isLoading">
        <div class="spinner"></div>
      </div>
      
      <img 
        [src]="imageUrl" 
        [alt]="alt"
        [class.loaded]="!isLoading"
        (load)="onImageLoad()"
        (error)="onImageError()"
        [style.display]="isLoading ? 'none' : 'block'"
      />
      
      <div class="error-placeholder" *ngIf="hasError">
        <i class="icon-image-broken"></i>
        <span>Imagen no disponible</span>
      </div>
    </div>
  `,
  styleUrls: ['./optimized-image.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule]
})
export class OptimizedImageComponent implements OnInit, OnDestroy {
  @Input() src!: string;
  @Input() alt: string = '';
  @Input() options: ImageLoadOptions = {};
  @Input() lazy: boolean = true;

  imageUrl: string = '';
  isLoading: boolean = true;
  hasError: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(private imageService: ImageService) {}

  ngOnInit(): void {
    if (!this.src) {
      this.hasError = true;
      this.isLoading = false;
      return;
    }

    this.loadImage();
  }

  private loadImage(): void {
    this.isLoading = true;
    this.hasError = false;

    this.imageService.loadImage(this.src, this.options).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (url) => {
        this.imageUrl = url;
        this.isLoading = false;
        this.hasError = false;
      },
      error: (error) => {
        console.error('Error loading image:', error);
        this.isLoading = false;
        this.hasError = true;
      }
    });
  }

  onImageLoad(): void {
    this.isLoading = false;
    this.hasError = false;
  }

  onImageError(): void {
    this.isLoading = false;
    this.hasError = true;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
} 