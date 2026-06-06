import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '@env/environment';

export interface StoryUser {
  _id: string;
  name: string;
  lastName: string;
  avatar: string;
  isVerified?: boolean;
  isPremium?: boolean;
}

export interface Story {
  _id: string;
  userId: string;
  mediaUrl: string;
  mediaThumbnailUrl?: string;
  mediaType: 'image' | 'video';
  textOverlay?: string;
  expiresAt: string;
  createdAt: string;
  viewed?: boolean;
}

export interface StoryFeedGroup {
  userId: string;
  user: StoryUser;
  stories: Story[];
  hasUnviewed: boolean;
  isOwnStories?: boolean;
}

export interface StoryViewItem {
  _id: string;
  storyId: string;
  viewerId: string;
  viewedAt: string;
}

@Injectable({ providedIn: 'root' })
export class StoriesService {
  private readonly apiUrl = `${environment.API_URL}/stories`;

  private feedStoriesSubject = new BehaviorSubject<StoryFeedGroup[]>([]);
  feedStories$ = this.feedStoriesSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  loadFeedStories(): Observable<StoryFeedGroup[]> {
    return this.http.get<StoryFeedGroup[]>(`${this.apiUrl}/feed`).pipe(
      tap((groups) => this.feedStoriesSubject.next(groups)),
    );
  }

  getMyStories(): Observable<Story[]> {
    return this.http.get<Story[]>(`${this.apiUrl}/my`);
  }

  createStory(dto: { mediaUrl: string; mediaThumbnailUrl?: string; mediaType: 'image' | 'video'; textOverlay?: string }): Observable<Story> {
    return this.http.post<Story>(this.apiUrl, dto).pipe(
      tap(() => this.loadFeedStories().subscribe()),
    );
  }

  registerView(storyId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${storyId}/view`, {});
  }

  getStoryViews(storyId: string): Observable<StoryViewItem[]> {
    return this.http.get<StoryViewItem[]>(`${this.apiUrl}/${storyId}/views`);
  }

  deleteStory(storyId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${storyId}`).pipe(
      tap(() => {
        const current = this.feedStoriesSubject.value;
        const updated = current.map(g => ({
          ...g,
          stories: g.stories.filter(s => s._id !== storyId),
        })).filter(g => g.stories.length > 0);
        this.feedStoriesSubject.next(updated);
      }),
    );
  }

  markStoryViewed(storyId: string): void {
    const current = this.feedStoriesSubject.value;
    const updated = current.map(g => ({
      ...g,
      stories: g.stories.map(s => s._id === storyId ? { ...s, viewed: true } : s),
      hasUnviewed: g.stories.some(s => s._id !== storyId && !s.viewed),
    }));
    this.feedStoriesSubject.next(updated);
  }
}
