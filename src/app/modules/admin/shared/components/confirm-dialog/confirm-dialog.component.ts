import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  showCancel?: boolean;
  width?: string;
}

@Component({
  selector: 'worky-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  standalone: false
})
export class ConfirmDialogComponent {
  @Input() config: ConfirmDialogConfig = {
    title: 'Confirmar acción',
    message: '¿Estás seguro de que deseas continuar?',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    type: 'info',
    showCancel: true,
    width: '400px'
  };

  @Input() showDialog = false;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  get dialogClasses(): string {
    const classes = [];
    
    // Type classes for border accent
    if (this.config.type === 'danger') {
      classes.push('border-l-4 border-l-red-500');
    } else if (this.config.type === 'warning') {
      classes.push('border-l-4 border-l-amber-500');
    } else if (this.config.type === 'info') {
      classes.push('border-l-4 border-l-blue-500');
    } else if (this.config.type === 'success') {
      classes.push('border-l-4 border-l-emerald-500');
    }
    
    return classes.join(' ');
  }

  get iconClass(): string {
    const iconMap = {
      danger: 'material-icons-outlined text-danger',
      warning: 'material-icons-outlined text-warning',
      info: 'material-icons-outlined text-info',
      success: 'material-icons-outlined text-success'
    };
    return iconMap[this.config.type || 'info'];
  }

  get iconName(): string {
    const iconMap = {
      danger: 'error',
      warning: 'warning',
      info: 'info',
      success: 'check_circle'
    };
    return iconMap[this.config.type || 'info'];
  }

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onClose(): void {
    this.close.emit();
  }

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }
} 