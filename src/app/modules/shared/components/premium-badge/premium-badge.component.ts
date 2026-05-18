import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-premium-badge',
  template: `
    <span
      *ngIf="isPremium"
      class="premium-badge"
      title="Premium Member"
      aria-label="Premium Member">
      ⭐
    </span>
  `,
  styles: [`
    .premium-badge {
      display: inline-flex;
      align-items: center;
      font-size: 0.85em;
      line-height: 1;
      cursor: default;
      user-select: none;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class PremiumBadgeComponent {
  @Input() isPremium: boolean | undefined = false;
}
