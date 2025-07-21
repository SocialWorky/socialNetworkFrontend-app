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
  styleUrls: ['./confirm-dialog.component.scss'],
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
    const classes = ['confirm-dialog'];
    if (this.config.type) classes.push(`type-${this.config.type}`);
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