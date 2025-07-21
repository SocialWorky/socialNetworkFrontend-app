import { Component, Input } from '@angular/core';

export interface StatusBadgeConfig {
  type: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  showText?: boolean;
  customColor?: string;
  customBgColor?: string;
}

@Component({
  selector: 'worky-status-badge',
  templateUrl: './status-badge.component.html',
  styleUrls: ['./status-badge.component.scss'],
  standalone: false
})
export class StatusBadgeComponent {
  @Input() config: StatusBadgeConfig = {
    type: 'neutral',
    size: 'medium',
    showIcon: true,
    showText: true
  };

  @Input() text = '';
  @Input() icon = '';

  get badgeClasses(): string {
    const classes = ['status-badge'];
    if (this.config.size) classes.push(`size-${this.config.size}`);
    if (this.config.type) classes.push(`type-${this.config.type}`);
    return classes.join(' ');
  }

  get iconClass(): string {
    const iconMap = {
      success: 'check_circle',
      warning: 'warning',
      danger: 'error',
      info: 'info',
      neutral: 'circle'
    };
    return this.icon || iconMap[this.config.type] || 'circle';
  }

  get displayText(): string {
    if (!this.config.showText) return '';
    return this.text || this.getDefaultText();
  }

  private getDefaultText(): string {
    const textMap = {
      success: 'Activo',
      warning: 'Pendiente',
      danger: 'Error',
      info: 'Información',
      neutral: 'Neutral'
    };
    return textMap[this.config.type] || 'Estado';
  }
} 