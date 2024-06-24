import { ChangeDetectorRef, Component, Input, OnChanges, OnInit } from '@angular/core';
import { AuthService } from '@auth/services/auth.service';
import { Token } from '@shared/interfaces/token.interface';

@Component({
  selector: 'worky-avatar',
  templateUrl: './worky-avatar.component.html',
  styleUrls: ['./worky-avatar.component.scss'],
})
export class WorkyAvatarComponent implements OnInit, OnChanges {

  token!: Token;

  userAvatar: string = '';

  private _size: number = 30;

  imageData: string = ''; 

  private colors = [
    '#FF5733', // Rojo oscuro
    '#33FF57', // Verde oscuro
    '#3366FF', // Azul oscuro
    '#FF33FF', // Rosa oscuro
    '#9a1ba2', // Morado
    '#330033', // Violeta oscuro
    '#FF0066', // Rosa oscuro
    '#003366', // Azul marino
    '#660000', // Borgoña oscuro
    '#006633'  // Verde oscuro
  ];

  @Input() username: string = '';

  @Input() name?: string;

  @Input() img?: string;

  @Input()
  set size(value: number) {
    if (value >= 30 && value <= 100) {
      this._size = value;
    }
  }

  get size(): number {
    return this._size;
  }

  initials: string = '';

  backgroundColor: string = '';

  fontSize: number | null = null;

  constructor(private _authService: AuthService, private _cdr: ChangeDetectorRef) {

    this.token = this._authService.getDecodedToken();

    this.username = this.token.name;

    this.userAvatar = this.token.avatar;

    this.loadImageUser();

    this.fontSize = null;
    this._size = 30;
    this.colors = [...this.colors];
    this.fontSize = null;
  }
  // eslint-disable-next-line @angular-eslint/no-empty-lifecycle-method
  ngOnInit(): void {}

  ngOnChanges(): void {
    this.loadImageUser();
  }

  loadImageUser() {

    if(!this.name && !this.img) {

      if (this.username && !this.userAvatar) {
        this.generateAvatar();
      }
      if(this.userAvatar) this.imageData = this.userAvatar;
      this._cdr.markForCheck();

    }
    if (this.name && !this.img) {
      this.username = this.name;
      this.generateAvatar();
    }
    if (this.img) {
      this.imageData = this.img;
    }

  }

  generateAvatar() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const scaledSize = this.size;
    const fontSize = (this.size / 2.3);
    this.initials = this.getInitials(this.username);
    this.backgroundColor = this.getColor(this.initials[0]);

    if (ctx) {
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

      ctx.drawFocusIfNeeded(canvas);

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
      console.error('Error al obtener el contexto del canvas');
    }
  }

  getInitials(name: string): string {
    const nameArray = name.split(' ');
    if (nameArray.length === 1) {
      return nameArray[0].charAt(0).toUpperCase();
    } else {
      return (nameArray[0].charAt(0) + nameArray[1].charAt(0)).toUpperCase();
    }
  }

  getColor(letter: string): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const index = alphabet.indexOf(letter?.toUpperCase());
    if (index !== -1) {
      return this.colors[index % this.colors.length];
    }
    return this.colors[0];
  }
}
