import { ChangeDetectorRef, Component, Input, OnChanges, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '@auth/services/auth.service';
import { Token } from '@shared/interfaces/token.interface';
import { ImageLoadOptions } from '../../services/image.service';
import { MobileImageCacheService } from '../../services/mobile-image-cache.service';
import { GoogleImageService } from '../../services/google-image.service';
import { LogService, LevelLogEnum } from '../../services/core-apis/log.service';
import { UtilityService } from '../../services/utility.service';
import { environment } from '@env/environment';

@Component({
    selector: 'worky-avatar',
    templateUrl: './worky-avatar.component.html',
    styleUrls: ['./worky-avatar.component.scss'],
    standalone: false
})
export class WorkyAvatarComponent implements OnInit, OnChanges, OnDestroy {
  token?: Token;

  userAvatar = '';

  imageData = '';

  initials = '';

  backgroundColor = '';

  fontSize: number | null = null;

  isGeneratedAvatar = false;

  isLoading = true;

  hasError = false;

  imageOptions: ImageLoadOptions = {
    maxRetries: 2,
    retryDelay: 500,
    timeout: 5000,
    fallbackUrl: '/assets/img/shared/handleImageError.png'
  };

  private destroy$ = new Subject<void>();

  private _size = 30;

  private readonly colors = [
    '#FF5733', '#33FF57', '#3366FF', '#FF33FF', '#9a1ba2',
    '#330033', '#FF0066', '#003366', '#660000', '#006633'
  ];

  @Input() username = '';

  @Input() name?: string | null;

  @Input() img?: string | null;

  @Input() showInitials: boolean = true;

  @Output() load = new EventEmitter<void>();
  @Output() error = new EventEmitter<void>();

  @Input()
  set size(value: number) {
    if (value >= 10 && value <= 100) {
      this._size = value;
    }
  }

  get size(): number {
    return this._size;
  }

  constructor(
    private _authService: AuthService,
    private _mobileCacheService: MobileImageCacheService,
    private _googleImageService: GoogleImageService,
    private _logService: LogService,
    private _cdr: ChangeDetectorRef,
    private _utilityService: UtilityService
  ) {}

  ngOnInit(): void {
    this.token = this._authService.getDecodedToken() || undefined;
    this.generateInitialsAvatar(); // Always generate initials first
    this.generateAvatar();
  }

  ngOnChanges(): void {
    this.isLoading = true;
    this.hasError = false;
    this.isGeneratedAvatar = false;
    this.imageData = '';
    this.initials = '';
    this.backgroundColor = '';
    this.fontSize = null;
    
    this.generateInitialsAvatar(); // Always generate initials first
    this.generateAvatar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onImageError(): void {
    this._logService.log(LevelLogEnum.WARN, 'WorkyAvatarComponent', 'Image error event triggered', { 
      url: this.img || 'unknown' 
    });
    this.imageData = '';
    this.isGeneratedAvatar = true;
    this.isLoading = false;
    this.hasError = true;
    this._cdr.markForCheck();
  }

  onImageLoad(): void {
    this.hasError = false;
    this.isGeneratedAvatar = false;
    this._cdr.markForCheck();
    this.load.emit();
  }

  public forceInitials(): void {
    this.imageData = '';
    this.isGeneratedAvatar = true;
    this._cdr.markForCheck();
  }

  // Test method to verify initials work
  public testInitials(): void {
    this.generateInitialsAvatar();
    this._cdr.markForCheck();
  }



  private generateAvatar(): void {
    // Only try to load image if we have a valid URL
    const imgValue = this.img;
    
    if (!imgValue || 
        typeof imgValue !== 'string' ||
        imgValue.trim() === '' ||
        imgValue === 'null' ||
        imgValue === 'undefined' ||
        imgValue === 'NaN' ||
        imgValue.length < 3) {
      // Invalid or missing URL - show initials
      this.isGeneratedAvatar = true;
      this.isLoading = false;
      this.hasError = false;
      this._cdr.markForCheck();
      return;
    }
    
    // Early check: if URL looks like a relative MinIO path, ensure MINIO_BUCKET_URL is configured
    const knownMinIOPatterns = ['profileImg/', 'publications/', 'uploads/', 'config/', 'users/', 'comments/', 'thematic-images/', 'widgets/', 'profile/'];
    const looksLikeMinIOPath = knownMinIOPatterns.some(pattern => imgValue.startsWith(pattern) || imgValue.startsWith('/' + pattern));
    
    if (looksLikeMinIOPath && (!environment.MINIO_BUCKET_URL || environment.MINIO_BUCKET_URL.trim() === '')) {
      // URL looks like MinIO path but MINIO_BUCKET_URL is not configured
      this._logService.log(
        LevelLogEnum.ERROR,
        'WorkyAvatarComponent',
        'MINIO_BUCKET_URL is not configured - cannot load MinIO image',
        { originalUrl: imgValue, minioBucketUrl: environment.MINIO_BUCKET_URL }
      );
      this.isGeneratedAvatar = true;
      this.isLoading = false;
      this.hasError = false;
      this._cdr.markForCheck();
      return;
    }

    // Normalize URL for MinIO (handles both absolute and relative URLs)
    const normalizedUrl = this._utilityService.normalizeImageUrl(
      imgValue,
      environment.MINIO_BUCKET_URL || ''
    );

    // Check if normalized URL is valid (absolute URL, blob, or data URI)
    // Also check if normalizedUrl is empty (means MINIO_BUCKET_URL is not configured)
    const isValidUrl = normalizedUrl && normalizedUrl.trim() !== '' && (
      normalizedUrl.startsWith('http://') ||
      normalizedUrl.startsWith('https://') ||
      normalizedUrl.startsWith('blob:') ||
      normalizedUrl.startsWith('data:')
    );

    if (isValidUrl) {
      this.tryLoadImage(normalizedUrl);
    } else {
      // Invalid URL after normalization - this means normalizeImageUrl returned a relative path or empty string
      // This should not happen if MINIO_BUCKET_URL is configured correctly
      // Log warning and show initials instead of trying to load invalid URL
      this._logService.log(
        LevelLogEnum.WARN,
        'WorkyAvatarComponent',
        'Invalid URL after normalization - MINIO_BUCKET_URL may not be configured',
        { originalUrl: imgValue, normalizedUrl, minioBucketUrl: environment.MINIO_BUCKET_URL }
      );
      this.isGeneratedAvatar = true;
      this.isLoading = false;
      this.hasError = false;
      this._cdr.markForCheck();
    }
  }

  private tryLoadImage(imageUrl: string): void {
    // Double-check that URL is normalized (should already be normalized from generateAvatar)
    // But normalize again to be safe, in case it wasn't normalized properly
    const normalizedUrl = this._utilityService.normalizeImageUrl(imageUrl, environment.MINIO_BUCKET_URL || '');
    
    // Validate that normalized URL is absolute
    const isValidUrl = normalizedUrl.startsWith('http://') ||
                       normalizedUrl.startsWith('https://') ||
                       normalizedUrl.startsWith('blob:') ||
                       normalizedUrl.startsWith('data:');
    
    if (!isValidUrl) {
      // URL is still relative after normalization - MINIO_BUCKET_URL may not be configured
      this._logService.log(
        LevelLogEnum.WARN,
        'WorkyAvatarComponent',
        'URL is still relative after normalization - cannot load image',
        { originalUrl: imageUrl, normalizedUrl, minioBucketUrl: environment.MINIO_BUCKET_URL }
      );
      this.imageData = '';
      this.isGeneratedAvatar = true;
      this.isLoading = false;
      this.hasError = true;
      this._cdr.markForCheck();
      return;
    }

    this.isLoading = true;
    this._cdr.markForCheck();

    // Check if URL has cache-busting parameter (indicates fresh upload)
    const hasCacheBuster = normalizedUrl.includes('?t=');

    const timeout = setTimeout(() => {
      if (this.isLoading) {
        this._logService.log(LevelLogEnum.WARN, 'WorkyAvatarComponent', 'Image load timeout, falling back to initials', { url: normalizedUrl });
        this.imageData = '';
        this.isGeneratedAvatar = true;
        this.isLoading = false;
        this.hasError = true;
        this._cdr.markForCheck();
      }
    }, 3000);

    if (this.isGoogleImage(normalizedUrl)) {
      this.loadGoogleImage(normalizedUrl, timeout);
    } else {
      // Use native Image() for all platforms — avoids XHR blob-fetch which requires
      // CORS headers on MinIO. Browser-native image loading works without CORS.
      const img = new Image();
      img.src = normalizedUrl;

      img.onload = () => {
        clearTimeout(timeout);
        this.imageData = normalizedUrl;
        this.isLoading = false;
        this.isGeneratedAvatar = false;
        this.hasError = false;
        this._cdr.markForCheck();
        this.load.emit();
      };

      img.onerror = () => {
        clearTimeout(timeout);
        this._logService.log(LevelLogEnum.WARN, 'WorkyAvatarComponent', 'Failed to load image, falling back to initials', { url: normalizedUrl });
        this.imageData = '';
        this.isGeneratedAvatar = true;
        this.isLoading = false;
        this.hasError = true;
        this._cdr.markForCheck();
      };
    }
  }

  private loadImageWithMobileCache(imageUrl: string, timeout: NodeJS.Timeout): void {
    this._mobileCacheService.loadImage(imageUrl, 'profile', this.imageOptions)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cachedUrl) => {
          clearTimeout(timeout);
          this.imageData = cachedUrl;
          this.isLoading = false;
          this.isGeneratedAvatar = false;
          this.hasError = false;
          this._cdr.markForCheck();
          this.load.emit();
        },
        error: (error) => {
          // Mobile cache failed, try direct loading as fallback
          this._logService.log(LevelLogEnum.WARN, 'WorkyAvatarComponent', 'Mobile cache failed, trying direct load', {
            url: imageUrl,
            error: error?.message || 'Unknown error'
          });
          this.loadImageDirectly(imageUrl, timeout);
        }
      });
  }

  private loadImageDirectly(imageUrl: string, timeout: NodeJS.Timeout): void {
    // Normalize URL before using it (double-check)
    const normalizedUrl = this._utilityService.normalizeImageUrl(imageUrl, environment.MINIO_BUCKET_URL || '');
    
    // Validate that normalized URL is absolute
    const isValidUrl = normalizedUrl.startsWith('http://') ||
                       normalizedUrl.startsWith('https://') ||
                       normalizedUrl.startsWith('blob:') ||
                       normalizedUrl.startsWith('data:');
    
    if (!isValidUrl) {
      // URL is still relative - cannot load
      this._logService.log(
        LevelLogEnum.WARN,
        'WorkyAvatarComponent',
        'URL is still relative in loadImageDirectly - cannot load image',
        { originalUrl: imageUrl, normalizedUrl }
      );
      clearTimeout(timeout);
      this.imageData = '';
      this.isGeneratedAvatar = true;
      this.isLoading = false;
      this.hasError = true;
      this._cdr.markForCheck();
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = normalizedUrl;

    img.onload = () => {
      clearTimeout(timeout);
      this.imageData = normalizedUrl;
      this.isLoading = false;
      this.isGeneratedAvatar = false;
      this.hasError = false;
      this._cdr.markForCheck();
      this.load.emit();
    };

    img.onerror = () => {
      clearTimeout(timeout);
      this._logService.log(LevelLogEnum.WARN, 'WorkyAvatarComponent', 'Direct image load also failed, falling back to initials', { url: normalizedUrl });
      this.imageData = '';
      this.isGeneratedAvatar = true;
      this.isLoading = false;
      this.hasError = true;
      this._cdr.markForCheck();
    };
  }

  private isGoogleImage(url: string): boolean {
    return url.includes('lh3.googleusercontent.com') ||
           url.includes('lh4.googleusercontent.com') ||
           url.includes('lh5.googleusercontent.com') ||
           url.includes('lh6.googleusercontent.com');
  }

  private loadGoogleImage(imageUrl: string, timeout: NodeJS.Timeout): void {
    this._googleImageService.getGoogleImage(imageUrl, this.size)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cachedUrl) => {
          clearTimeout(timeout);
          
          // Check if we got a valid URL or fallback
          if (cachedUrl && cachedUrl.trim() !== '' && cachedUrl !== '/assets/img/shared/handleImageError.png') {
            this.imageData = cachedUrl;
            this.isGeneratedAvatar = false;
            this.isLoading = false;
            this.hasError = false;
            this._cdr.markForCheck();
            this.load.emit();
          } else {
            // Fallback to initials if no valid image
            this.imageData = '';
            this.isGeneratedAvatar = true;
            this.isLoading = false;
            this.hasError = false;
            this._cdr.markForCheck();
          }
        },
        error: (error) => {
          clearTimeout(timeout);
          // Failed to load Google image, falling back to initials - no need to log every failure
          this.imageData = '';
          this.isGeneratedAvatar = true;
          this.isLoading = false;
          this.hasError = true;
          this._cdr.markForCheck();
        }
      });
  }

  private generateInitialsAvatar(): void {
    this.isGeneratedAvatar = true;
    this.isLoading = false;
    this.hasError = false;
    this.imageData = '';

    const fullName = this.name || this.username || '';
    const nameParts = fullName.trim().split(' ').filter(part => part.length > 0);
    
    if (nameParts.length >= 2) {
      this.initials = (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
    } else if (nameParts.length === 1) {
      this.initials = nameParts[0].charAt(0).toUpperCase();
    } else {
      const username = this.username || '';
      if (username.length > 0) {
        this.initials = username.charAt(0).toUpperCase();
      } else {
        this.initials = '?';
      }
    }

    const nameHash = this.hashCode(fullName || this.username || 'user');
    this.backgroundColor = this.colors[Math.abs(nameHash) % this.colors.length];

    this.fontSize = Math.max(12, Math.min(24, this.size * 0.4));



    this._cdr.markForCheck();
  }

  // Force initials immediately for testing
  public forceInitialsNow(): void {
    this.generateInitialsAvatar();
  }

  public forceFallbackToInitials(): void {
    this.imageData = '';
    this.isGeneratedAvatar = true;
    this.isLoading = false;
    this.hasError = true;
    this._cdr.markForCheck();
  }

  private hashCode(str: string): number {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }
}
