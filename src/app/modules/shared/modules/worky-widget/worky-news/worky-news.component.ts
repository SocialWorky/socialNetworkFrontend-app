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
    // Get current date in Chile timezone (UTC-3)
    const currentDate = new Date();
    
    // Adjust for Chile timezone (UTC-3 or UTC-4)
    const chileOffset = -3; // UTC-3 for Chile standard time
    const utcTime = currentDate.getTime() + (currentDate.getTimezoneOffset() * 60000);
    const chileTime = new Date(utcTime + (chileOffset * 3600000));
    
    const year = chileTime.getFullYear();
    const month = (chileTime.getMonth() + 1).toString().padStart(2, '0');
    const day = chileTime.getDate().toString().padStart(2, '0');
    const date = `${year}-${month}-${day}`;

    this._newsService.getNews(date).pipe(
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
