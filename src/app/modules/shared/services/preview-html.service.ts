import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { marked } from 'marked';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ContentService {
  constructor(private http: HttpClient) {}

  fetchMetadata(url: string): Observable<any> {
    return this.http.get(`${environment.API_URL}/scrape?url=${encodeURIComponent(url)}`).pipe(
      catchError(() => of(null)) // Handle errors gracefully
    );
  }

  processContent(value: string): Observable<{ markdownHtml: string, previewsHtml: string }> {
    if (!value) return of({ markdownHtml: '', previewsHtml: '' });

    const urlPattern = /(?:https?:\/\/[\S]+)|(?:www\.[\S]+)|(?:[\w-]+\.[\w]+[\S]*[^\s.;,()])/ig;
    const urls = value.match(urlPattern) || [];

    // Convert Markdown to HTML
    const markdownHtml = marked(value) as string;  // Explicitly cast to string

    if (urls.length === 0) {
      return of({ markdownHtml, previewsHtml: '' });
    }

    const metadataRequests = urls.map(url => {
      const normalizedUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
      return this.fetchMetadata(normalizedUrl).pipe(
        map(metadata => ({ url: normalizedUrl, metadata }))
      );
    });

    return forkJoin(metadataRequests).pipe(
      map(results => {
        let previewsHtml = '';

        results.forEach(result => {
          const dataMeta = this.generatePreviewHTML(result.metadata);
          if (dataMeta !== '') {
            previewsHtml += `<div class="link-preview" data-url="${result.url}" onclick="window.open('${result.url}', '_blank')">${dataMeta}</div>`;
          }
        });

        return { markdownHtml, previewsHtml };
      })
    );
  }

  private generatePreviewHTML(metadata: any): string {
    if (!metadata || !metadata.ogTitle) return '';

    return `
      <div class="link-preview-content">
        ${metadata.ogImage?.url ? `<img src="${metadata.ogImage.url}" alt="Preview Image">` : ''}
        <div class="link-preview-info">
          <h3>${metadata.ogTitle}</h3>
          <p>${metadata.ogDescription}</p>
        </div>
      </div>
    `;
  }
}
