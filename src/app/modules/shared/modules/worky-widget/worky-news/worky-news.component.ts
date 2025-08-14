import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { NewsService } from './service/apiNews';
import { NewsArticle } from './interface/dataNews.interface';
import { LogService, LevelLogEnum } from '@shared/services/core-apis/log.service';

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

  constructor(
    private _newsService: NewsService,
    private _cdr: ChangeDetectorRef,
    private _logService: LogService
  ) {}

  ngOnInit() {
    const currentDate = new Date();
    const chileTime = new Date(currentDate.toLocaleString("en-US", {timeZone: "America/Santiago"}));
    
    const year = chileTime.getFullYear();
    const month = (chileTime.getMonth() + 1).toString().padStart(2, '0');
    const day = chileTime.getDate().toString().padStart(2, '0');
    const currentDateString = `${year}-${month}-${day}`;

    this._newsService.getNews(currentDateString).pipe(
      switchMap(articles => {
        if (articles.length > 0) {
          const shouldFetchFreshNews = this.shouldFetchFreshNews(articles);
          
          if (shouldFetchFreshNews) {
            this._newsService.getFetchNews().subscribe(() => {
              setTimeout(() => {
                this._newsService.getNews(currentDateString).subscribe(updatedArticles => {
                  if (updatedArticles.length > 0) {
                    this.articles = updatedArticles;
                    this._cdr.markForCheck();
                  } else {
                    this.articles = articles;
                    this._cdr.markForCheck();
                  }
                });
              }, 3000);
            });
            
            return of(articles);
          } else {
            return of(articles);
          }
        }
        
        const previousDateChile = new Date(chileTime);
        previousDateChile.setDate(chileTime.getDate() - 1);
        const prevYear = previousDateChile.getFullYear();
        const prevMonth = (previousDateChile.getMonth() + 1).toString().padStart(2, '0');
        const prevDay = previousDateChile.getDate().toString().padStart(2, '0');
        const previousDateString = `${prevYear}-${prevMonth}-${prevDay}`;
        
        return this._newsService.getNews(previousDateString);
      }),
      switchMap(articles => {
        if (articles.length > 0) {
          const areFromPreviousDay = this.shouldFetchFreshNews(articles);
          
          if (areFromPreviousDay) {
            this._newsService.getFetchNews().subscribe(() => {
              setTimeout(() => {
                this._newsService.getNews(currentDateString).subscribe(updatedArticles => {
                  if (updatedArticles.length > 0) {
                    this.articles = updatedArticles;
                    this._cdr.markForCheck();
                  } else {
                    this.articles = articles;
                    this._cdr.markForCheck();
                  }
                });
              }, 3000);
            });
          }
          
          return of(articles);
        }
        
        return this._newsService.getFetchNews();
      }),
      catchError(error => {
        this._logService.log(LevelLogEnum.ERROR, 'WorkyNewsComponent', 'Error fetching news for Chile', { error });
        return of([]);
      })
    ).subscribe(articles => {
      this.articles = articles;
      this.loading = false;
      this._cdr.markForCheck();
    });
  }

  private shouldFetchFreshNews(articles: NewsArticle[]): boolean {
    if (!articles || articles.length === 0) {
      return true;
    }

    const currentDate = new Date();
    const chileTime = new Date(currentDate.toLocaleString("en-US", {timeZone: "America/Santiago"}));
    
    const year = chileTime.getFullYear();
    const month = (chileTime.getMonth() + 1).toString().padStart(2, '0');
    const day = chileTime.getDate().toString().padStart(2, '0');
    const todayString = `${year}-${month}-${day}`;

    const firstArticle = articles[0];
    if (!firstArticle.pubDate) {
      return true;
    }

    const articleDate = new Date(firstArticle.pubDate);
    const articleDateChile = new Date(articleDate.toLocaleString("en-US", {timeZone: "America/Santiago"}));
    
    const articleYear = articleDateChile.getFullYear();
    const articleMonth = (articleDateChile.getMonth() + 1).toString().padStart(2, '0');
    const articleDay = articleDateChile.getDate().toString().padStart(2, '0');
    const articleDateString = `${articleYear}-${articleMonth}-${articleDay}`;

    return articleDateString !== todayString;
  }
}
