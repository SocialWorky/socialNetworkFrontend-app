import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';
import { Observable, forkJoin, of } from 'rxjs';
import { marked } from 'marked';
import hljs from 'highlight.js';

import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class ContentService {

  constructor(private http: HttpClient) {
    const renderer = new marked.Renderer();
    renderer.code = ({ text, lang, escaped }: { text: string; lang?: string; escaped?: boolean }) => {
      const validLanguage = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
      const highlighted = hljs.highlight(text, { language: validLanguage }).value;
      return `<pre><code class="hljs ${validLanguage}">${highlighted}</code></pre>`;
    };
    renderer.codespan = ({ text }: { text: string }) => {
      return `<code class="inline-code">${text}</code>`;
    };
    marked.setOptions({
      renderer: renderer,
      langPrefix: 'hljs ',
      gfm: true,
      breaks: true,
      highlight: function(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
      },
    });
  }

  fetchMetadata(linkUrl: string): Observable<any> {
    const url = `${environment.API_URL}/scrape?url=${encodeURIComponent(linkUrl)}`;
    return this.http.get(url).pipe(
      catchError(() => of(null))
    );
  }

  processContent(value: string): Observable<{ markdownHtml: string, previewsHtml: string, youTubeHtml: string }> {
    if (!value) return of({ markdownHtml: '', previewsHtml: '', youTubeHtml: '' });

    const markdownHtml = marked(value) as string;

    const urls = this.extractAndFilterUrls(value);

    if (urls.length === 0) {
      return of({ markdownHtml, previewsHtml: '', youTubeHtml: '' });
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
        let youTubeHtml = '';

        results.forEach(result => {
          const { previewHtml, isYouTube } = this.generatePreviewHTML(result.url, result.metadata);
          if (isYouTube) {
            youTubeHtml += previewHtml;
          } else {
            previewsHtml += previewHtml;
          }
        });

        return { markdownHtml, previewsHtml, youTubeHtml };
      })
    );
  }

  private extractAndFilterUrls(text: string): string[] {
    // Pattern to extract URLs
    const urlPattern = /(?:https?:\/\/[^\s)]+)|(?:www\.[^\s)]+)|(?:[\w-]+\.[\w]+[^\s)]+[^\s.;,()])/ig;
    // Pattern to identify images in Markdown
    const imagePattern = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
    // Pattern to identify code blocks
    const codeBlockPattern = /```[\s\S]*?```|`[^`\r\n]+`/g;

    // Extraer todas las URLs
    const allUrls = text.match(urlPattern) || [];

    // Extract image URLs
    const imageUrls: string[] = [];
    let match;
    while ((match = imagePattern.exec(text)) !== null) {
      imageUrls.push(match[1]);
    }

    // Extract URLs in code blocks
    const codeBlockUrls: string[] = [];
    while ((match = codeBlockPattern.exec(text)) !== null) {
      const codeBlockText = match[0];
      const urlsInCodeBlock = codeBlockText.match(urlPattern) || [];
      codeBlockUrls.push(...urlsInCodeBlock);
    }

    // Filter image URLs and URLs in code blocks from all URLs
    const nonImageAndNonCodeBlockUrls = allUrls.filter(url => !imageUrls.includes(url) && !codeBlockUrls.includes(url));

    return nonImageAndNonCodeBlockUrls;
  }

  private generatePreviewHTML(url: string, metadata: any): { previewHtml: string, isYouTube: boolean } {
    // Detectar si es un enlace de YouTube
    const youTubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i;
    const youTubeMatch = url.match(youTubeRegex);

    if (youTubeMatch) {
      const videoId = youTubeMatch[1];
      const youTubeHtml = `
        <div class="link-preview-youtube">
          <iframe width="100%" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>
        </div>
      `;
      return { previewHtml: youTubeHtml, isYouTube: true };
    }

    if (!metadata || !metadata.ogTitle) return { previewHtml: '', isYouTube: false };

    const displayTitle = metadata.ogTitle || metadata.twitterTitle || metadata.linkedinTitle;
    const displayDescription = metadata.ogDescription || metadata.twitterDescription || metadata.linkedinDescription;
    const displayImage = metadata.ogImage?.url || metadata.twitterImage?.url || metadata.linkedinImage;

    const previewHtml = `
      <div class="link-preview-content" style="border: 1px solid #ddd; padding: 10px; border-radius: 5px; margin-bottom: 10px; display: flex; align-items: center;">
        ${displayImage ? `<div style="flex-shrink: 0; width: 100px; height: 100px; overflow: hidden; margin-right: 10px;"><img src="${displayImage}" alt="Preview Image" style="width: 100%; height: auto;"></div>` : ''}
        <div class="link-preview-info" style="flex-grow: 1; text-align: left;">
          <h3 style="margin: 0; font-size: 1.2em; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${displayTitle}</h3>
          <p style="margin: 5px 0; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${displayDescription}</p>
        </div>
      </div>
    `;
    return { previewHtml, isYouTube: false };
  }
}
