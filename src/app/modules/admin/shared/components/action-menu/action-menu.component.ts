import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: string;
  type?: 'default' | 'danger' | 'warning' | 'success';
  disabled?: boolean;
  divider?: boolean;
  tooltip?: string;
}

export interface ActionMenuConfig {
  triggerIcon?: string;
  triggerText?: string;
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  size?: 'small' | 'medium' | 'large';
  showTriggerIcon?: boolean;
  showTriggerText?: boolean;
}

@Component({
  selector: 'worky-action-menu',
  templateUrl: './action-menu.component.html',
  styleUrls: ['./action-menu.component.scss'],
  standalone: false
})
export class ActionMenuComponent {
  @Input() config: ActionMenuConfig = {
    triggerIcon: 'more_vert',
    triggerText: 'Acciones',
    position: 'bottom-right',
    size: 'medium',
    showTriggerIcon: true,
    showTriggerText: false
  };

  @Input() items: ActionMenuItem[] = [];
  @Input() disabled = false;
  @Output() actionClick = new EventEmitter<string>();

  isOpen = false;

  get triggerClasses(): string {
    const classes = ['action-trigger'];
    if (this.config.size) classes.push(`size-${this.config.size}`);
    if (this.disabled) classes.push('disabled');
    return classes.join(' ');
  }

  get menuClasses(): string {
    const classes = ['action-menu'];
    if (this.config.position) classes.push(`position-${this.config.position}`);
    if (this.config.size) classes.push(`size-${this.config.size}`);
    return classes.join(' ');
  }

  get triggerDisplay(): string {
    if (this.config.showTriggerText && this.config.triggerText) {
      return this.config.triggerText;
    }
    return '';
  }

  toggleMenu(): void {
    if (!this.disabled) {
      this.isOpen = !this.isOpen;
    }
  }

  onActionClick(item: ActionMenuItem): void {
    if (!item.disabled && !item.divider) {
      this.actionClick.emit(item.id);
      this.isOpen = false;
    }
  }

  onOutsideClick(): void {
    this.isOpen = false;
  }

  getItemClasses(item: ActionMenuItem): string {
    const classes = ['menu-item'];
    if (item.type) classes.push(`type-${item.type}`);
    if (item.disabled) classes.push('disabled');
    if (item.divider) classes.push('divider');
    return classes.join(' ');
  }
} 