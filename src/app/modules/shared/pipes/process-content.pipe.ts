import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
    name: 'workyProcessContent',
    standalone: false
})
export class WorkyProcessContentPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | undefined): string | SafeHtml {
    if (!value) return '';
    const urlPattern = /(?:https?:\/\/[\S]+)|(?:www\.[\S]+)|(?:[\w-]+\.[\w]+[\S]*[^\s.;,()])/ig;
    let processedContent = value.replace(urlPattern, (match) => {
      if (match.startsWith('http://') || match.startsWith('https://')) {
        return `<a href="${match}" target="_blank">${match}</a>`;
      } else {
        const url = `https://${match}`;
        return `<a href="${url}" target="_blank">${match}</a>`;
      }
    });

    return this.sanitizer.bypassSecurityTrustHtml(processedContent);
  }
}
