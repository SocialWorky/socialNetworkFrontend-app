import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NewsService } from './service/apiNews';
import { NewsArticle } from './interface/dataNews.interface';
import { of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
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
    // Get current date in Chile timezone
    const currentDate = new Date();
    
    // Get Chile timezone (automatically handles DST)
    const chileTime = new Date(currentDate.toLocaleString("en-US", {timeZone: "America/Santiago"}));
    
    const year = chileTime.getFullYear();
    const month = (chileTime.getMonth() + 1).toString().padStart(2, '0');
    const day = chileTime.getDate().toString().padStart(2, '0');
    const currentDateString = `${year}-${month}-${day}`;

    this._newsService.getNews(currentDateString).pipe(
      switchMap(articles => {
        if (articles.length > 0) {
          return of(articles);
        }
        
        // If no news for today, try previous day in Chile
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
          // Try to get fresh news using getFetchNews in background
          this._newsService.getFetchNews().subscribe(freshArticles => {
            if (freshArticles.length > 0) {
              this.articles = freshArticles;
              this._cdr.markForCheck();
            }
          });
          
          return of(articles);
        }
        
        // If no news from previous day, use general fetch
        return this._newsService.getFetchNews();
      }),
      catchError(error => {
        this._logService.log(LevelLogEnum.ERROR, 'WorkyNewsComponent', 'Error fetching news for Chile', { error });
        return of([]); // In case of error, return empty array
      })
    ).subscribe(articles => {
      this.articles = articles;
      this.loading = false;
      this._cdr.markForCheck();
    });
  }
}

