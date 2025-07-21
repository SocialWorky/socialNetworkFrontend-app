import { Component, Input } from '@angular/core';

export interface LoadingSpinnerConfig {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'white';
  text?: string;
  overlay?: boolean;
  fullScreen?: boolean;
}

@Component({
  selector: 'worky-loading-spinner',
  templateUrl: './loading-spinner.component.html',
  styleUrls: ['./loading-spinner.component.scss'],
  standalone: false
})
export class LoadingSpinnerComponent {
  @Input() config: LoadingSpinnerConfig = {
    size: 'medium',
    color: 'primary',
    text: 'Cargando...',
    overlay: false,
    fullScreen: false
  };

  @Input() loading = false;

  get spinnerClasses(): string {
    const classes = ['loading-spinner'];
    
    if (this.config.overlay) classes.push('with-overlay');
    if (this.config.fullScreen) classes.push('full-screen');
    if (this.config.size) classes.push(`size-${this.config.size}`);
    if (this.config.color) classes.push(`color-${this.config.color}`);
    
    return classes.join(' ');
  }
} 