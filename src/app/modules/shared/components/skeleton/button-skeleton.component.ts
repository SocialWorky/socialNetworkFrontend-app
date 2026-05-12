import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'worky-button-skeleton',
  template: `
    <div
      role="status"
      aria-label="Loading button"
      class="sk-shimmer sk-button"
      [style.width]="width"
      [style.height]="height">
    </div>
  `,
  styles: [`
    :host { display: inline-block; }
    .sk-button { border-radius: 8px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: []
})
export class ButtonSkeletonComponent {
  @Input() width: string = '100px';
  @Input() height: string = '36px';
}
