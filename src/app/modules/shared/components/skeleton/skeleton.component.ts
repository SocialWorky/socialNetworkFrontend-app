import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SkeletonType = 'text' | 'avatar' | 'image' | 'button' | 'card' | 'list-item' | 'publication' | 'profile' | 'comment' | 'widget';
export type SkeletonMediaType = 'image' | 'video';

@Component({
  selector: 'worky-skeleton',
  template: `
    <div role="status" [class]="getContainerClass()">

      <!-- text -->
      <div *ngIf="type === 'text'"
           class="sk-shimmer sk-text"
           [style.width]="width"
           [style.height]="height">
      </div>

      <!-- avatar -->
      <div *ngIf="type === 'avatar'"
           class="sk-shimmer sk-avatar"
           [style.width]="width"
           [style.height]="width">
      </div>

      <!-- standalone image / video -->
      <div *ngIf="type === 'image'" class="sk-shimmer sk-media-block">
        <ng-container [ngTemplateOutlet]="mediaIcon"></ng-container>
      </div>

      <!-- button -->
      <div *ngIf="type === 'button'"
           class="sk-shimmer sk-btn"
           [style.width]="width"
           [style.height]="height">
      </div>

      <!-- publication card -->
      <div *ngIf="type === 'publication'" class="sk-card">
        <div class="sk-card-header">
          <div class="sk-shimmer sk-avatar sk-avatar-md"></div>
          <div class="sk-card-meta">
            <div class="sk-shimmer sk-text sk-text-name"></div>
            <div class="sk-shimmer sk-text sk-text-meta"></div>
          </div>
        </div>

        <div class="sk-card-body">
          <div class="sk-shimmer sk-text sk-text-line"></div>
          <div class="sk-shimmer sk-text sk-text-line sk-w80"></div>
          <div class="sk-shimmer sk-text sk-text-line sk-w65"></div>
        </div>

        <div *ngIf="showMedia" class="sk-shimmer sk-media-block sk-media-tall">
          <ng-container [ngTemplateOutlet]="mediaIcon"></ng-container>
        </div>

        <div class="sk-card-actions">
          <div class="sk-shimmer sk-btn sk-action-btn"></div>
          <div class="sk-shimmer sk-btn sk-action-btn"></div>
          <div class="sk-shimmer sk-btn sk-action-btn"></div>
        </div>
      </div>

      <!-- profile card -->
      <div *ngIf="type === 'profile'" class="sk-card">
        <div class="sk-shimmer sk-cover"></div>
        <div class="sk-profile-body">
          <div class="sk-profile-top">
            <div class="sk-shimmer sk-avatar sk-avatar-lg sk-avatar-border"></div>
            <div class="sk-card-meta sk-profile-meta">
              <div class="sk-shimmer sk-text sk-text-name-lg"></div>
              <div class="sk-shimmer sk-text sk-text-bio"></div>
            </div>
          </div>
          <div class="sk-profile-stats">
            <div class="sk-stat" *ngFor="let _ of [1,2,3]">
              <div class="sk-shimmer sk-text sk-stat-num"></div>
              <div class="sk-shimmer sk-text sk-stat-label"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- comment -->
      <div *ngIf="type === 'comment'" class="sk-comment">
        <div class="sk-shimmer sk-avatar sk-avatar-sm"></div>
        <div class="sk-comment-body">
          <div class="sk-shimmer sk-text sk-text-name-sm"></div>
          <div class="sk-shimmer sk-text sk-text-line"></div>
          <div class="sk-shimmer sk-text sk-text-line sk-w75"></div>
        </div>
      </div>

      <!-- list-item -->
      <div *ngIf="type === 'list-item'" class="sk-list-item">
        <div class="sk-shimmer sk-avatar sk-avatar-md"></div>
        <div class="sk-list-meta">
          <div class="sk-shimmer sk-text sk-text-name"></div>
          <div class="sk-shimmer sk-text sk-text-meta"></div>
        </div>
      </div>

      <!-- card -->
      <div *ngIf="type === 'card'" class="sk-card">
        <div class="sk-card-header">
          <div class="sk-shimmer sk-avatar sk-avatar-md"></div>
          <div class="sk-card-meta">
            <div class="sk-shimmer sk-text sk-text-name"></div>
            <div class="sk-shimmer sk-text sk-text-meta"></div>
          </div>
        </div>
        <div class="sk-card-body">
          <div class="sk-shimmer sk-text sk-text-line"></div>
          <div class="sk-shimmer sk-text sk-text-line sk-w75"></div>
          <div class="sk-shimmer sk-text sk-text-line sk-w50"></div>
        </div>
        <div class="sk-card-actions">
          <div class="sk-shimmer sk-btn sk-btn-md"></div>
          <div class="sk-shimmer sk-btn sk-btn-md"></div>
        </div>
      </div>

      <!-- widget -->
      <div *ngIf="type === 'widget'" class="sk-card">
        <div class="sk-shimmer sk-text sk-widget-title"></div>
        <div class="sk-card-body">
          <div class="sk-shimmer sk-text sk-text-line"></div>
          <div class="sk-shimmer sk-text sk-text-line sk-w80"></div>
          <div class="sk-shimmer sk-text sk-text-line sk-w60"></div>
        </div>
        <div class="sk-shimmer sk-btn sk-btn-md"></div>
      </div>

    </div>

    <!-- reusable media icon template -->
    <ng-template #mediaIcon>
      <ng-container *ngIf="mediaType === 'video'">
        <div class="sk-play-btn" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </ng-container>
      <ng-container *ngIf="mediaType !== 'video'">
        <svg class="sk-photo-icon" viewBox="0 0 20 18" fill="currentColor" aria-hidden="true">
          <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z"/>
        </svg>
      </ng-container>
    </ng-template>
  `,
  styles: [`
    :host { display: block; }

    /* ── primitives ── */
    .sk-text    { border-radius: 100px; }
    .sk-avatar  { border-radius: 50%; }
    .sk-btn     { border-radius: 8px; }

    /* ── avatar sizes ── */
    .sk-avatar-sm  { width: 32px;  height: 32px; }
    .sk-avatar-md  { width: 40px;  height: 40px; flex-shrink: 0; }
    .sk-avatar-lg  { width: 72px;  height: 72px; flex-shrink: 0; }
    .sk-avatar-border { border: 3px solid #fff; margin-top: -36px; }

    /* ── text widths ── */
    .sk-w80 { max-width: 80%; }
    .sk-w75 { max-width: 75%; }
    .sk-w65 { max-width: 65%; }
    .sk-w60 { max-width: 60%; }
    .sk-w50 { max-width: 50%; }
    .sk-text-name    { width: 120px; height: 13px; margin-bottom: 4px; }
    .sk-text-name-lg { width: 160px; height: 16px; margin-bottom: 4px; }
    .sk-text-name-sm { width: 80px;  height: 11px; }
    .sk-text-meta    { width: 72px;  height: 10px; }
    .sk-text-bio     { width: 100%;  height: 10px; }
    .sk-text-line    { width: 100%;  height: 10px; margin-bottom: 6px; }
    .sk-stat-num     { width: 28px;  height: 14px; margin: 0 auto 4px; }
    .sk-stat-label   { width: 48px;  height: 10px; margin: 0 auto; }
    .sk-widget-title { width: 120px; height: 18px; margin-bottom: 12px; }

    /* ── media blocks ── */
    .sk-media-block {
      width: 100%;
      height: 200px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sk-media-tall { height: 200px; margin: 8px 0; }

    /* ── card layout ── */
    .sk-card {
      background: var(--worky-color-module-container, #fff);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .sk-card-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .sk-card-meta {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .sk-card-body {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .sk-card-actions {
      display: flex;
      justify-content: space-around;
      gap: 8px;
    }
    .sk-action-btn { width: 60px; height: 32px; border-radius: 100px; }
    .sk-btn-md     { width: 80px; height: 32px; border-radius: 100px; }

    /* ── cover ── */
    .sk-cover { width: 100%; height: 120px; border-radius: 8px 8px 0 0; }

    /* ── profile ── */
    .sk-profile-body { padding: 0; }
    .sk-profile-top {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      margin-bottom: 16px;
    }
    .sk-profile-meta { flex: 1; }
    .sk-profile-stats {
      display: flex;
      justify-content: space-around;
      padding-top: 12px;
      border-top: 1px solid rgba(0,0,0,0.06);
    }
    .sk-stat { display: flex; flex-direction: column; align-items: center; }

    /* ── comment ── */
    .sk-comment {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px;
    }
    .sk-comment-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    /* ── list-item ── */
    .sk-list-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px;
    }
    .sk-list-meta {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    /* ── media icons ── */
    .sk-play-btn {
      width: 48px; height: 48px;
      border-radius: 50%;
      background: rgba(0,0,0,0.1);
      display: flex; align-items: center; justify-content: center;
    }
    .sk-play-btn svg {
      width: 26px; height: 26px;
      color: rgba(0,0,0,0.22);
      margin-left: 3px;
    }
    .sk-photo-icon { width: 34px; height: 34px; color: rgba(0,0,0,0.12); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule]
})
export class SkeletonComponent {
  @Input() type: SkeletonType = 'text';
  @Input() width: string = '100%';
  @Input() height: string = '20px';
  @Input() showMedia: boolean = true;
  @Input() mediaType: SkeletonMediaType = 'image';

  getContainerClass(): string {
    return '';
  }
}
