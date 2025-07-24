import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { UtilityService } from '@shared/services/utility.service';

@Component({
  selector: 'worky-image',
  template: `
    <div class="worky-image-container" [class.loading]="isLoading" [class.error]="hasError">
      <img 
        *ngIf="!hasError && !isLoading"
        [src]="currentSrc" 
        [alt]="alt"
        [class]="cssClass"
        (load)="onImageLoad()"
        (error)="onImageError()"
        (click)="onImageClick($event)"
      />
      
      <div *ngIf="isLoading" class="image-loading">
        <div class="loading-spinner"></div>
      </div>
      
      <div *ngIf="hasError" class="image-error">
        <i class="material-icons">image</i>
      </div>
    </div>
  `,
  styleUrls: ['./worky-image.component.scss'],
  standalone: false
})
export class WorkyImageComponent implements OnInit, OnDestroy, OnChanges {
  @Input() src: string = '';
  @Input() fallbackSrc: string = 'assets/img/shared/handleImageError.png';
  @Input() alt: string = '';
  @Input() cssClass: string = '';
  @Output() imageClick = new EventEmitter<MouseEvent>();

  currentSrc: string = '';
  isLoading: boolean = true;
  hasError: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private _utilityService: UtilityService,
    private _cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadImage();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['src'] && !changes['src'].firstChange) {
      this.loadImage();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadImage(): void {
    if (!this.src) {
      this.setError();
      return;
    }

    this.isLoading = true;
    this.hasError = false;
    this._cdr.markForCheck();

    // Use the preload method to handle errors silently
    this._utilityService.preloadImage(this.src, this.fallbackSrc)
      .then((successfulSrc) => {
        this.currentSrc = successfulSrc;
        this.isLoading = false;
        this._cdr.markForCheck();
      })
      .catch((error) => {
        this.setError();
      });
  }

  private setError(): void {
    this.currentSrc = this.fallbackSrc;
    this.isLoading = false;
    this.hasError = true;
    this._cdr.markForCheck();
  }

  onImageLoad(): void {
    this.isLoading = false;
    this.hasError = false;
    this._cdr.markForCheck();
  }

  onImageError(): void {
    this.setError();
  }

  onImageClick(event: MouseEvent): void {
    this.imageClick.emit(event);
  }
} 