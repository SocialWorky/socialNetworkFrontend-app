import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-verified-badge',
  template: `
    <span
      *ngIf="isVerified"
      class="verified-badge"
      title="Verified"
      aria-label="Verified"
      style="display:inline-flex;align-items:center;color:#1DA1F2;font-size:0.9em;margin-left:2px;cursor:default;user-select:none;">
      ✓
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class VerifiedBadgeComponent {
  @Input() isVerified: boolean | undefined = false;
}
