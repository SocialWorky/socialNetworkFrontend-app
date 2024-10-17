import { ChangeDetectorRef, Component, Input, OnChanges, OnInit } from '@angular/core';
import { AuthService } from '@auth/services/auth.service';
import { Token } from '@shared/interfaces/token.interface';

@Component({
  selector: 'worky-avatar',
  templateUrl: './worky-avatar.component.html',
  styleUrls: ['./worky-avatar.component.scss'],
})
export class WorkyAvatarComponent implements OnInit, OnChanges {
  token?: Token;

  userAvatar = '';

  imageData = '';

  initials = '';

  backgroundColor = '';

  fontSize: number | null = null;

  private _size = 30;

  private readonly colors = [
    '#FF5733', '#33FF57', '#3366FF', '#FF33FF', '#9a1ba2',
    '#330033', '#FF0066', '#003366', '#660000', '#006633'
  ];

  @Input() username = '';

  @Input() name?: string | null;

  @Input() img?: string | null;

  @Input()
  set size(value: number) {
    if (value >= 10 && value <= 100) {
      this._size = value;
    }
  }
  
  get size(): number {
    return this._size;
  }

  constructor(private _authService: AuthService, private _cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.token = this._authService.getDecodedToken()!;

    this.username = this.token?.name || '';

    this.userAvatar = this.token?.avatar || '';

    this.loadImageUser();

  }

  ngOnChanges(): void {
    this.loadImageUser();
  }

  private loadImageUser() {
    this.img = this.img === 'null' ? null : this.img;

    if (!this.name && !this.img) {
      if (this.username && !this.userAvatar) {
        this.generateAvatar();
      } else if (this.userAvatar) {
        this.imageData = this.userAvatar;
      }
    } else if (this.name && !this.img && this.name.length > 2) {
      this.username = this.name;
      this.generateAvatar();
    } 
    if (this.img) {
      this.imageData = this.img;
    }

    this._cdr.markForCheck();
  }

  private generateAvatar() {
    const canvas = document.createElement('canvas');

    const ctx = canvas.getContext('2d');

    if (ctx) {
      const scaledSize = this.size;

      const fontSize = this.size / 2.3;

      this.initials = this.getInitials(this.username);
      
      if (this.initials) {
        this.backgroundColor = this.getColor(this.initials[0]);

        canvas.width = scaledSize;

        canvas.height = scaledSize;

        ctx.beginPath();
        ctx.fillStyle = this.backgroundColor;
        ctx.arc(scaledSize / 2, scaledSize / 2, scaledSize / 2, 0, 2 * Math.PI);
        ctx.fill();

        ctx.font = `${fontSize}px Roboto, sans-serif`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.initials, scaledSize / 2, scaledSize / 1.85);

        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = this.size;
        finalCanvas.height = this.size;
        const finalCtx = finalCanvas.getContext('2d');

        if (finalCtx) {
          finalCtx.drawImage(canvas, 0, 0, scaledSize, scaledSize, 0, 0, this.size, this.size);
          this.imageData = finalCanvas.toDataURL('image/png');
        } else {
          console.error('Error al obtener el contexto del canvas final');
        }
      } else {
        console.error('Iniciales no válidas');
      }
    } else {
      console.error('Error al obtener el contexto del canvas');
    }
  }

  private getInitials(name: string): string {
    const nameArray = name.split(' ');
    return nameArray.length === 1
      ? nameArray[0].charAt(0).toUpperCase()
      : (nameArray[0].charAt(0) + nameArray[1].charAt(0)).toUpperCase();
  }

  private getColor(letter: string): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const index = alphabet.indexOf(letter.toUpperCase());
    return index !== -1 ? this.colors[index % this.colors.length] : this.colors[0];
  }
}
