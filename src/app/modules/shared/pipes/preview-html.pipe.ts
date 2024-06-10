import { Pipe, PipeTransform } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { environment } from '@env/environment';

@Pipe({
  name: 'workyPreviewHtml'
})
export class WorkyPreviewHtmlPipe implements PipeTransform {

  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}

  transform(value: string | undefined): string | SafeHtml {
    if (!value) return '';

    const urlPattern = /(?:https?:\/\/[\S]+)|(?:www\.[\S]+)|(?:[\w-]+\.[\w]+[\S]*[^\s.;,()])/ig;
    const urls = value.match(urlPattern);

    if (!urls || urls.length === 0) return '';

    urls.forEach(url => {
      const normalizedUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
      this.fetchMetadata(normalizedUrl);
    });

    return this.sanitizer.bypassSecurityTrustHtml(urls.map(url => `<div class="link-preview" data-url="${url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`}" onclick="window.open('${url}', '_blank')"></div>`).join(''));
  }


  private fetchMetadata(url: string): void {
    this.http.get(`${environment.API_URL}/scrape?url=${encodeURIComponent(url)}`).subscribe((metadata: any) => {
      const linkPreviews = document.querySelectorAll(`.link-preview[data-url="${url}"]`);
      linkPreviews.forEach(preview => {
        const dataMeta = this.generatePreviewHTML(metadata);
        if (dataMeta !== '') {
          preview.innerHTML = dataMeta;
        } else {
          preview.remove();
        }
      });
    });
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
