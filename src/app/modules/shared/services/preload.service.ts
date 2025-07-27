import { Injectable } from '@angular/core';
import { MediaCacheService } from './media-cache.service';
import { ConnectionQualityService } from './connection-quality.service';
import { LogService, LevelLogEnum } from './core-apis/log.service';

@Injectable({
  providedIn: 'root'
})
export class PreloadService {
  private preloadQueue: string[] = [];
  private isPreloading = false;
  private readonly MAX_CONCURRENT_PRELOADS = 3;
  private readonly PRELOAD_DELAY = 1000;

  constructor(
    private mediaCacheService: MediaCacheService,
    private connectionQualityService: ConnectionQualityService,
    private logService: LogService
  ) {}

  addToPreloadQueue(urls: string[]): void {
    const validUrls = urls.filter(url => url && !this.preloadQueue.includes(url));
    this.preloadQueue.push(...validUrls);



    if (!this.isPreloading) {
      this.startPreloading();
    }
  }

  private startPreloading(): void {
    if (this.isPreloading || this.preloadQueue.length === 0) {
      return;
    }

    this.isPreloading = true;
    this.processPreloadQueue();
  }

  private processPreloadQueue(): void {
    if (this.preloadQueue.length === 0) {
      this.isPreloading = false;
      return;
    }

    const connectionOptions = this.connectionQualityService.getOptimizedMediaOptions();
    
    const urlsToPreload = this.preloadQueue.splice(0, this.MAX_CONCURRENT_PRELOADS);
    


    urlsToPreload.forEach(url => {
      this.mediaCacheService.loadMedia(url, {
        ...connectionOptions,
        preload: true
      }).subscribe({
        next: () => {
        },
        error: (error) => {
          this.logService.log(LevelLogEnum.WARN, 'PreloadService', 'Preload failed', { 
            url, 
            error: error.message 
          });
        }
      });
    });

    setTimeout(() => {
      this.processPreloadQueue();
    }, this.PRELOAD_DELAY);
  }

  preloadForPage(pageType: 'home' | 'profile' | 'publication' | 'messages', data: any): void {
    const urls: string[] = [];

    switch (pageType) {
      case 'home':
        urls.push(...this.extractMediaUrlsFromPublications(data.publications || []));
        break;
      case 'profile':
        urls.push(...this.extractMediaUrlsFromProfile(data));
        break;
      case 'publication':
        urls.push(...this.extractMediaUrlsFromPublication(data));
        break;
      case 'messages':
        urls.push(...this.extractMediaUrlsFromMessages(data.messages || []));
        break;
    }

    if (urls.length > 0) {
      this.addToPreloadQueue(urls);
    }
  }

  private extractMediaUrlsFromPublications(publications: any[]): string[] {
    const urls: string[] = [];
    
    publications.forEach(publication => {
      if (publication.media && Array.isArray(publication.media)) {
        publication.media.forEach((media: any) => {
          if (media.urlCompressed) urls.push(media.urlCompressed);
          if (media.urlThumbnail) urls.push(media.urlThumbnail);
        });
      }
    });

    return urls;
  }

  private extractMediaUrlsFromProfile(profile: any): string[] {
    const urls: string[] = [];
    
    if (profile.profileImage) urls.push(profile.profileImage);
    if (profile.coverImage) urls.push(profile.coverImage);
    
    if (profile.publications) {
      urls.push(...this.extractMediaUrlsFromPublications(profile.publications));
    }

    return urls;
  }

  private extractMediaUrlsFromPublication(publication: any): string[] {
    const urls: string[] = [];
    
    if (publication.media && Array.isArray(publication.media)) {
      publication.media.forEach((media: any) => {
        if (media.urlCompressed) urls.push(media.urlCompressed);
        if (media.urlThumbnail) urls.push(media.urlThumbnail);
        if (media.url) urls.push(media.url);
      });
    }

    return urls;
  }

  private extractMediaUrlsFromMessages(messages: any[]): string[] {
    const urls: string[] = [];
    
    messages.forEach(message => {
      if (message.urlFile) urls.push(message.urlFile);
      if (message.thumbnail) urls.push(message.thumbnail);
    });

    return urls;
  }

  clearPreloadQueue(): void {
    this.preloadQueue = [];
    this.isPreloading = false;
    

  }

  getPreloadStats(): { queueSize: number; isPreloading: boolean } {
    return {
      queueSize: this.preloadQueue.length,
      isPreloading: this.isPreloading
    };
  }
} 