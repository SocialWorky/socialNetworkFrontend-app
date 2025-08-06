import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NewsService } from './service/apiNews';
import { NewsArticle } from './interface/dataNews.interface';
import { of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

@Component({
    selector: 'worky-news',
    templateUrl: './worky-news.component.html',
    styleUrls: ['./worky-news.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class WorkyNewsComponent implements OnInit {
  articles: NewsArticle[] = [];
  loading = true;

  constructor(private _newsService: NewsService, private _cdr: ChangeDetectorRef) {}

  ngOnInit() {
    const currentDate = new Date();
    const date = currentDate.toISOString().split('T')[0];

    this._newsService.getNews(date).pipe(
      switchMap(articles => {
        if (articles.length) {
          return of(articles);
        }
        const previousDate = new Date(currentDate);
        previousDate.setDate(currentDate.getDate() - 1);
        const previousDateString = previousDate.toISOString().split('T')[0];
        return this._newsService.getNews(previousDateString);
      }),
      switchMap(articles => {
        if (articles.length) {
          return of(articles);
        }
        return this._newsService.getFetchNews();
      }),
      catchError(error => {
        console.error('Error fetching news', error);
        return of([]); // In case of error, return empty array
      })
    ).subscribe(articles => {
      this.articles = articles;
      this.loading = false;
      this._cdr.markForCheck(); // Asegurarse de que se detecten los cambios
    });
  }
}
