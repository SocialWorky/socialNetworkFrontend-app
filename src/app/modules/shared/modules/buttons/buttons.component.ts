import { ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, Output } from '@angular/core';
import { WorkyButtonType, WorkyButtonTheme } from './models/worky-button-model';

@Component({
  selector: 'worky-buttons',
  templateUrl: './buttons.component.html',
  styleUrls: ['./buttons.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonsComponent {
  @Input() theme: WorkyButtonTheme = WorkyButtonTheme.Primary;
  @Input() workyButtonType: WorkyButtonType = WorkyButtonType.Flat;
  @Input() disabled = false;
  @Input() width?: string;

  @Output() clickEvent = new EventEmitter<void>();

  @HostBinding('class')
  get themeClass(): string {
    return `theme-${this.theme.toLowerCase()}`;
  }

  @HostBinding('class.worky-button-disabled')
  get isDisabled(): boolean {
    return this.disabled;
  }

  onButtonClick() {
    if (!this.disabled) {
      this.clickEvent.emit();
    }
  }

  get buttonTypeClass(): string {
    return `worky-button-${this.workyButtonType.toLowerCase()}`;
  }
}
