import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class MetaTagService {
  constructor(
    private _meta: Meta,
    private _titleService: Title
  ) {}

  updateMetaTags(title: string, description: string, imageUrl: string, url: string) {

    this._titleService.setTitle(title);

    this._meta.updateTag({ name: 'title', content: title });
    this._meta.updateTag({ name: 'description', content: description });
    
    this._meta.updateTag({ property: 'og:type', content: 'website' });
    this._meta.updateTag({ property: 'og:url', content: url });
    this._meta.updateTag({ property: 'og:title', content: title });
    this._meta.updateTag({ property: 'og:description', content: description });
    this._meta.updateTag({ property: 'og:image', content: imageUrl });

    this._meta.updateTag({ property: 'twitter:card', content: 'summary_large_image' });
    this._meta.updateTag({ property: 'twitter:url', content: url });
    this._meta.updateTag({ property: 'twitter:title', content: title });
    this._meta.updateTag({ property: 'twitter:description', content: description });
    this._meta.updateTag({ property: 'twitter:image', content: imageUrl });
  }
}
