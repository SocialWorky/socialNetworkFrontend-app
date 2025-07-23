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
    const classes = [];
    
    // Size classes
    if (this.config.size === 'small') {
      classes.push('px-2 py-0.5 text-xs');
    } else if (this.config.size === 'large') {
      classes.push('px-4 py-2 text-sm');
    } else {
      classes.push('px-3 py-1 text-xs'); // medium default
    }
    
    // Type classes
    if (this.config.type === 'success') {
      classes.push('bg-emerald-500/10 text-emerald-400 border border-emerald-500/20');
    } else if (this.config.type === 'warning') {
      classes.push('bg-amber-500/10 text-amber-400 border border-amber-500/20');
    } else if (this.config.type === 'danger') {
      classes.push('bg-red-500/10 text-red-400 border border-red-500/20');
    } else if (this.config.type === 'info') {
      classes.push('bg-blue-500/10 text-blue-400 border border-blue-500/20');
    } else {
      classes.push('bg-slate-500/10 text-slate-400 border border-slate-500/20'); // neutral
    }
    
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