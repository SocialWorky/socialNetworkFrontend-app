import { Component, Input, OnInit } from '@angular/core';
import { AuthService } from '../../auth/services/auth.service';
import { Token } from '../interfaces/token.interface';

@Component({
  selector: 'worky-avatar',
  templateUrl: './worky-avatar.component.html',
  styleUrls: ['./worky-avatar.component.scss'],
})
export class WorkyAvatarComponent implements OnInit {

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

  constructor(private _authService: AuthService) {

    this.token = this._authService.getDecodedToken();

    this.username = this.token.name;

    this.userAvatar = this.token.avatar;

    if (this.username && !this.userAvatar) {
      this.generateAvatar();
    }

    if (this.userAvatar) this.imageData = this.userAvatar;

    this.fontSize = null;
    this._size = 30;
    this.colors = [...this.colors];
    this.fontSize = null;
  }
  ngOnInit(): void {
    this.username = this.token.name;
    this.userAvatar = this.token.avatar;
  }


  // eslint-disable-next-line @angular-eslint/use-lifecycle-interface
  ngOnChanges() {
    if (this.username && !this.userAvatar) {
      this.generateAvatar();
    }
    if(this.userAvatar) this.imageData = this.userAvatar;
  }

  generateAvatar() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    this.fontSize = this.size / 2.5;
    this.initials = this.getInitials(this.username);
    this.backgroundColor = this.getColor(this.initials[0]);

    if (ctx) {
      canvas.width = this.size;
      canvas.height = this.size;

      ctx.beginPath();
      ctx.fillStyle = this.backgroundColor;
      ctx.arc(this.size / 2.0, this.size / 2.1, this.size / 2.1 - 2, 0, 2 * Math.PI);
      ctx.fill();

      ctx.font = `${this.fontSize}px Roboto, sans-serif`;
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.initials, this.size / 2, this.size / 2);

      this.imageData = canvas.toDataURL('image/png');
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
