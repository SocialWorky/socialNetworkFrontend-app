import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ContentService } from '@shared/services/preview-html.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Pipe({
  name: 'workyPreviewHtml'
})
export class WorkyPreviewHtmlPipe implements PipeTransform {

  constructor(private contentService: ContentService, private sanitizer: DomSanitizer) {}

  transform(value: string | undefined): Observable<{ markdownHtml: SafeHtml, previewsHtml: SafeHtml }> {
    if (!value) return new Observable<{ markdownHtml: SafeHtml, previewsHtml: SafeHtml }>(observer => observer.next({ markdownHtml: '', previewsHtml: '' }));

    return this.contentService.processContent(value).pipe(
      map(({ markdownHtml, previewsHtml }) => ({
        markdownHtml: this.sanitizer.bypassSecurityTrustHtml(markdownHtml),
        previewsHtml: this.sanitizer.bypassSecurityTrustHtml(previewsHtml)
      }))
    );

  }
}
