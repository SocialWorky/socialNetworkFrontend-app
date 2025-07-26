import { ChangeDetectorRef, Component, Input, OnChanges, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '@auth/services/auth.service';
import { Token } from '@shared/interfaces/token.interface';
import { ImageLoadOptions } from '../../services/image.service';
import { MobileImageCacheService } from '../../services/mobile-image-cache.service';
import { GoogleImageService } from '../../services/google-image.service';
import { LogService, LevelLogEnum } from '../../services/core-apis/log.service';

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
    private _cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.token = this._authService.getDecodedToken() || undefined;
    this.generateAvatar();
  }

  ngOnChanges(): void {
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
    this.isLoading = false;
    this.hasError = true;
    this.imageData = ''; // Limpiar imagen fallida
    this.generateInitialsAvatar();
  }

  private generateAvatar(): void {
    // Si no hay imagen o la imagen está vacía, generar iniciales
    if (!this.img || this.img.trim() === '' || this.img === 'null') {
      this.generateInitialsAvatar();
    } else {
      this.validateAndSetImage(this.img);
    }
  }

  private validateAndSetImage(imageUrl: string): void {
    this.isGeneratedAvatar = false;
    this.isLoading = true;
    this.hasError = false;
    this._cdr.markForCheck();

    // Verificar si es una imagen de Google
    if (this.isGoogleImage(imageUrl)) {
      this.loadGoogleImage(imageUrl);
    } else {
      // Usar mobile cache service para otras imágenes
      if (this._mobileCacheService.isMobile()) {
        this._mobileCacheService.loadImage(imageUrl, 'profile', this.imageOptions)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (cachedUrl) => {
              this.imageData = cachedUrl;
              this.isLoading = false;
              this.hasError = false;
              this._cdr.markForCheck();
            },
            error: (error) => {
              this._logService.log(LevelLogEnum.WARN, 'WorkyAvatarComponent', 'Failed to load image from mobile cache', { 
                url: imageUrl, 
                error: error.message 
              });
              this.isLoading = false;
              this.hasError = true;
              this.generateInitialsAvatar();
            }
          });
      } else {
        // Fallback para desktop
        const img = new Image();
        img.src = imageUrl;

        img.onload = () => {
          this.imageData = imageUrl;
          this.isLoading = false;
          this.hasError = false;
          this._cdr.markForCheck();
        };

        img.onerror = () => {
          this._logService.log(LevelLogEnum.WARN, 'WorkyAvatarComponent', 'Failed to load image', { url: imageUrl });
          this.isLoading = false;
          this.hasError = true;
          this.generateInitialsAvatar();
        };
      }
    }
  }

  private isGoogleImage(url: string): boolean {
    return url.includes('lh3.googleusercontent.com') || 
           url.includes('lh4.googleusercontent.com') || 
           url.includes('lh5.googleusercontent.com') || 
           url.includes('lh6.googleusercontent.com');
  }

  private loadGoogleImage(imageUrl: string): void {
    this._googleImageService.getGoogleImage(imageUrl, this.size)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cachedUrl) => {
          this.imageData = cachedUrl;
          this.isLoading = false;
          this.hasError = false;
          this._cdr.markForCheck();
        },
        error: (error) => {
          this._logService.log(LevelLogEnum.WARN, 'WorkyAvatarComponent', 'Failed to load Google image', { 
            url: imageUrl, 
            error: error.message 
          });
          this.isLoading = false;
          this.hasError = true;
          this.generateInitialsAvatar();
        }
      });
  }

  private generateInitialsAvatar(): void {
    this.isGeneratedAvatar = true;
    this.isLoading = false;
    this.hasError = false;
    this.imageData = ''; // Asegurar que no hay imagen

    const fullName = this.name || this.username || '';
    const nameParts = fullName.trim().split(' ').filter(part => part.length > 0);
    
    if (nameParts.length >= 2) {
      this.initials = (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
    } else if (nameParts.length === 1) {
      this.initials = nameParts[0].charAt(0).toUpperCase();
    } else {
      this.initials = '?';
    }

    // Generar color de fondo basado en el nombre
    const nameHash = this.hashCode(fullName);
    this.backgroundColor = this.colors[Math.abs(nameHash) % this.colors.length];

    // Calcular tamaño de fuente
    this.fontSize = Math.max(12, Math.min(24, this.size * 0.4));

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
