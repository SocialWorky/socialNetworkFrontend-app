import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { StoryFeedGroup } from '@shared/services/core-apis/stories.service';

@Component({
  selector: 'worky-stories-carousel',
  templateUrl: './stories-carousel.component.html',
  styleUrls: ['./stories-carousel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class StoriesCarouselComponent {
  @Input() groups: StoryFeedGroup[] = [];
  @Input() currentUserId = '';

  @Output() storySelected = new EventEmitter<{ groupIndex: number }>();
  @Output() addStoryClicked = new EventEmitter<void>();

  selectGroup(index: number): void {
    this.storySelected.emit({ groupIndex: index });
  }

  getAvatarBorderStyle(group: StoryFeedGroup): string {
    if (group.isOwnStories) return 'none';
    return group.hasUnviewed ? '3px solid #f59e0b' : '3px solid #64748b';
  }

  getUserDisplayName(group: StoryFeedGroup): string {
    if (group.isOwnStories) return 'Tu historia';
    return group.user.name;
  }
}
