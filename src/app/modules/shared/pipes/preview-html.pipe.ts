import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SecurityContext } from '@angular/core';
import { ContentService } from '@shared/services/preview-html.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Pipe({
    name: 'workyPreviewHtml',
    standalone: false
})
export class WorkyPreviewHtmlPipe implements PipeTransform {

  constructor(private contentService: ContentService, private sanitizer: DomSanitizer) {}

  private safe(html: string): SafeHtml {
    const cleaned = this.sanitizer.sanitize(SecurityContext.HTML, html) ?? '';
    return this.sanitizer.bypassSecurityTrustHtml(cleaned);
  }

  transform(value: string | undefined): Observable<{ markdownHtml: SafeHtml, previewsHtml: SafeHtml, youTubeHtml: SafeHtml }> {
    if (!value) {
      return new Observable<{ markdownHtml: SafeHtml, previewsHtml: SafeHtml, youTubeHtml: SafeHtml }>(observer => observer.next({ markdownHtml: '', previewsHtml: '', youTubeHtml: '' }));
    }

    return this.contentService.processContent(value).pipe(
      map(({ markdownHtml, previewsHtml, youTubeHtml }) => ({
        markdownHtml: this.safe(markdownHtml),
        previewsHtml: this.safe(previewsHtml),
        youTubeHtml: this.safe(youTubeHtml),
      }))
    );
  }
}
