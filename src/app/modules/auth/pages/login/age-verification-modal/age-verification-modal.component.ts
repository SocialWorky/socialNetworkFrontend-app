import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'worky-age-verification-modal',
  templateUrl: './age-verification-modal.component.html',
  styleUrls: ['./age-verification-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AgeVerificationModalComponent {
  @Input() visible = false;
  @Input() blocked = false;
  @Input() modalText = '';

  @Output() accepted = new EventEmitter<void>();
  @Output() rejected = new EventEmitter<void>();
  @Output() reloadRequested = new EventEmitter<void>();
}
