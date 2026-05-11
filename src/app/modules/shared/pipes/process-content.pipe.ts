import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SecurityContext } from '@angular/core';

@Pipe({
    name: 'workyProcessContent',
    standalone: false
})
export class WorkyProcessContentPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) {}

  private isSafeUrl(url: string): boolean {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  transform(value: string | undefined): string | SafeHtml {
    if (!value) return '';
    const sanitizedText = this.sanitizer.sanitize(SecurityContext.HTML, value) ?? '';
    const urlPattern = /(?:https?:\/\/[\S]+)|(?:www\.[\S]+)|(?:[\w-]+\.[\w]+[\S]*[^\s.;,()])/ig;
    const processedContent = sanitizedText.replace(urlPattern, (match) => {
      if (!this.isSafeUrl(match)) return match;
      const href = match.startsWith('http') ? match : `https://${match}`;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${match}</a>`;
    });

    return this.sanitizer.bypassSecurityTrustHtml(processedContent);
  }
}
