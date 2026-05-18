import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { Story, StoryFeedGroup, StoriesService } from '@shared/services/core-apis/stories.service';

const IMAGE_DURATION_MS = 5000;
const TICK_MS = 100;

@Component({
  selector: 'worky-story-viewer',
  templateUrl: './story-viewer.component.html',
  styleUrls: ['./story-viewer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class StoryViewerComponent implements OnChanges, OnDestroy {
  @Input() groups: StoryFeedGroup[] = [];
  @Input() initialGroupIndex = 0;
  @Input() visible = false;
  @Output() closed = new EventEmitter<void>();

  groupIndex = 0;
  storyIndex = 0;
  progress = 0;

  private timer: ReturnType<typeof setInterval> | null = null;
  private totalMs = IMAGE_DURATION_MS;
  private elapsedMs = 0;

  constructor(
    private readonly storiesService: StoriesService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.groupIndex = this.initialGroupIndex;
      this.storyIndex = 0;
      this.startStory();
    }
    if (changes['visible']?.currentValue === false) {
      this.stopTimer();
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  get currentGroup(): StoryFeedGroup | null {
    return this.groups[this.groupIndex] ?? null;
  }

  get currentStory(): Story | null {
    return this.currentGroup?.stories[this.storyIndex] ?? null;
  }

  get progressSegments(): number[] {
    return Array.from({ length: this.currentGroup?.stories.length ?? 0 }, (_, i) => i);
  }

  getSegmentFill(segmentIndex: number): number {
    if (segmentIndex < this.storyIndex) return 100;
    if (segmentIndex === this.storyIndex) return this.progress;
    return 0;
  }

  private startStory(): void {
    this.stopTimer();
    if (!this.currentStory) { this.close(); return; }

    this.progress = 0;
    this.elapsedMs = 0;
    this.totalMs = this.currentStory.mediaType === 'video' ? IMAGE_DURATION_MS : IMAGE_DURATION_MS;

    // Register view asynchronously
    this.storiesService.registerView(this.currentStory._id).subscribe();
    this.storiesService.markStoryViewed(this.currentStory._id);

    this.timer = setInterval(() => {
      this.elapsedMs += TICK_MS;
      this.progress = Math.min(100, (this.elapsedMs / this.totalMs) * 100);
      if (this.elapsedMs >= this.totalMs) this.next();
      this.cdr.markForCheck();
    }, TICK_MS);
  }

  private stopTimer(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  onVideoDuration(duration: number): void {
    this.totalMs = duration * 1000;
  }

  next(): void {
    if (this.storyIndex < (this.currentGroup?.stories.length ?? 1) - 1) {
      this.storyIndex++;
    } else if (this.groupIndex < this.groups.length - 1) {
      this.groupIndex++;
      this.storyIndex = 0;
    } else {
      this.close();
      return;
    }
    this.startStory();
  }

  prev(): void {
    if (this.storyIndex > 0) {
      this.storyIndex--;
    } else if (this.groupIndex > 0) {
      this.groupIndex--;
      this.storyIndex = (this.currentGroup?.stories.length ?? 1) - 1;
    }
    this.startStory();
  }

  onTap(event: MouseEvent): void {
    const x = event.clientX;
    const midX = window.innerWidth / 2;
    if (x > midX) this.next(); else this.prev();
  }

  close(): void {
    this.stopTimer();
    this.closed.emit();
  }
}
