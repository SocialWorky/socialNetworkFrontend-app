import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';
import { Observable, forkJoin, of } from 'rxjs';
import { marked } from 'marked';
import hljs from 'highlight.js';

import { environment } from '@env/environment';
import { LazyCssService } from './core-apis/lazy-css.service';
import { UtilityService } from './utility.service';

@Injectable({
  providedIn: 'root'
})
export class ContentService {

  private _highlightJsLoaded = false;

  constructor(
    private http: HttpClient,
    private lazyCssService: LazyCssService,
    private utilityService: UtilityService
  ) {
    this.initializeMarked();
  }

  private async initializeMarked() {
    await this.loadHighlightJsCss();
    
    const renderer = new marked.Renderer();
    renderer.code = ({ text, lang, escaped }: { text: string; lang?: string; escaped?: boolean }) => {
      const validLanguage = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
      const highlighted = hljs.highlight(text, { language: validLanguage }).value;
      return `<pre><code class="hljs ${validLanguage}">${highlighted}</code></pre>`;
    };
    renderer.codespan = ({ text }: { text: string }) => {
      return `<code class="inline-code">${text}</code>`;
    };
    // Normalize image URLs in markdown to ensure MinIO URLs are properly formatted
    renderer.image = (token: any) => {
      const href = token.href || '';
      const title = token.title || null;
      const text = token.text || null;
      // Normalize the image URL to handle MinIO relative paths
      const normalizedHref = this.utilityService.normalizeImageUrl(href, environment.MINIO_BUCKET_URL || '');
      const titleAttr = title ? ` title="${title}"` : '';
      const altAttr = text ? ` alt="${text}"` : '';
      return `<img src="${normalizedHref}"${altAttr}${titleAttr} />`;
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

  /**
   * Carga CSS de highlight.js solo cuando se necesite
   */
  private async loadHighlightJsCss() {
    if (!this._highlightJsLoaded) {
      try {
        await this.lazyCssService.loadHighlightJs();
        this._highlightJsLoaded = true;
      } catch (error) {
        // CSS loading error handled
      }
    }
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

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }

  private escapeAttr(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private generatePreviewHTML(url: string, metadata: any): { previewHtml: string, isYouTube: boolean } {
    const youTubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i;
    const youTubeMatch = url.match(youTubeRegex);

    if (youTubeMatch) {
      const videoId = youTubeMatch[1];
      return {
        previewHtml: `<div class="link-preview-youtube"><iframe width="100%" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe></div>`,
        isYouTube: true,
      };
    }

    if (!metadata || !metadata.ogTitle) return { previewHtml: '', isYouTube: false };

    const title = metadata.ogTitle || metadata.twitterTitle || metadata.linkedinTitle || '';
    const description = metadata.ogDescription || metadata.twitterDescription || metadata.linkedinDescription || '';
    const rawImage = metadata.ogImage?.url || metadata.twitterImage?.url || metadata.linkedinImage || '';
    const image = rawImage.startsWith('http://') || rawImage.startsWith('https://') ? rawImage : '';

    const domain = this.extractDomain(url);
    const faviconSrc = `https://www.google.com/s2/favicons?domain=${domain}&amp;sz=16`;

    const imageBlock = image
      ? `<div class="lp-image"><img src="${this.escapeAttr(image)}" alt="${this.escapeAttr(title)}" /></div>`
      : '';

    const descBlock = description
      ? `<div class="lp-desc">${this.escapeAttr(description)}</div>`
      : '';

    const previewHtml = `
      <a href="${this.escapeAttr(url)}" target="_blank" rel="noopener noreferrer" class="lp-card">
        ${imageBlock}
        <div class="lp-body">
          <div class="lp-domain">
            <img class="lp-favicon" src="${faviconSrc}" alt="" />
            <span>${this.escapeAttr(domain)}</span>
          </div>
          <div class="lp-title">${this.escapeAttr(title)}</div>
          ${descBlock}
        </div>
      </a>`;

    return { previewHtml, isYouTube: false };
  }
}

