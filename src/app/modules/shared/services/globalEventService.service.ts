import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GlobalEventService {
  private profileImageSubject = new BehaviorSubject<string | null>(null);

  profileImage$ = this.profileImageSubject.asObservable();

  updateProfileImage(newImageUrl: string) {
    this.profileImageSubject.next(newImageUrl);
  }


  sanitizeHtml(html: string): string {

    let result = html;

    const markdownImageRegex = /!\[.*?\]\((.*?)\)/;
    const markdownImageMatch = html.match(markdownImageRegex);
    if (markdownImageMatch) {
      result = 'se envió una imagen ';
    }

    return result;
  }

}
