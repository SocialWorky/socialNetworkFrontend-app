import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ImageSkeletonMediaType = 'image' | 'video';

@Component({
  selector: 'worky-image-skeleton',
  template: `
    <div
      role="status"
      aria-label="Loading media"
      class="sk-image-container"
      [class.sk-rounded]="rounded"
      [style.width]="width"
      [style.height]="height">
      <div class="sk-shimmer sk-image-inner">

        <ng-container *ngIf="mediaType === 'video'">
          <div class="sk-play-btn" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </ng-container>

        <ng-container *ngIf="mediaType === 'image'">
          <svg class="sk-photo-icon" viewBox="0 0 20 18" fill="currentColor"
               aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z"/>
          </svg>
        </ng-container>

      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .sk-image-container {
      position: relative;
      overflow: hidden;
      border-radius: 4px;
    }
    .sk-rounded { border-radius: 8px; }

    .sk-image-inner {
      width: 100%;
      height: 100%;
      min-height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .sk-play-btn {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sk-play-btn svg {
      width: 26px;
      height: 26px;
      color: rgba(0, 0, 0, 0.22);
      margin-left: 3px;
    }

    .sk-photo-icon {
      width: 34px;
      height: 34px;
      color: rgba(0, 0, 0, 0.12);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule]
})
export class ImageSkeletonComponent {
  @Input() width: string = '100%';
  @Input() height: string = '200px';
  @Input() rounded: boolean = true;
  @Input() mediaType: ImageSkeletonMediaType = 'image';
}
