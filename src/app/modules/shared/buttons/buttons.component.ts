import { ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, Output } from '@angular/core';
import { WorkyButtonType, WorkyButtonTheme } from './models/worky-button-model';

@Component({
  selector: 'worky-buttons',
  templateUrl: './buttons.component.html',
  styleUrls: ['./buttons.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonsComponent {

  WorkyButtonType = WorkyButtonType;

  @HostBinding('class.theme-basic')
  themeBasic = false;

  @HostBinding('class.theme-primary')
  themePrimary = true;

  @HostBinding('class.theme-accent')
  themeAccent = false;

  @HostBinding('class.theme-warn')
  themeWarn = false;

  get isBasic() {
    return this.workyButtonType === WorkyButtonType.Basic;
  }

  get isOutline() {
    return this.workyButtonType === WorkyButtonType.Outline;
  }

  get isFlat() {
    return this.workyButtonType === WorkyButtonType.Flat;
  }

  @Input()
  set theme(color: WorkyButtonTheme) {
    this.themeBasic = color === WorkyButtonTheme.Basic;
    this.themePrimary = color === WorkyButtonTheme.Primary;
    this.themeAccent = color === WorkyButtonTheme.Accent;
    this.themeWarn = color === WorkyButtonTheme.Warn;
  }

  @Input()
  workyButtonType: WorkyButtonType = WorkyButtonType.Flat;

  @Input()
  disabled = false;

  // Input examples: '100%', '50%', '200px'
  @Input()
  width: string | undefined;

  @Output()
  clickEvent = new EventEmitter();

  constructor() {}

  onButtonClick() {
    this.clickEvent.emit();
  }

}
