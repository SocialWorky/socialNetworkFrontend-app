import { Component, OnInit } from '@angular/core';
import { NewsService } from './service/apiNews';
import { NewsArticle } from './interface/dataNews.interface';

@Component({
  selector: 'worky-news',
  templateUrl: './worky-news.component.html',
  styleUrls: ['./worky-news.component.scss'],
})
export class WorkyNewsComponent implements OnInit {
  articles: NewsArticle[] = [];

  constructor(private _newsService: NewsService) {}

ngOnInit() {
  const currentDate = new Date();
  const date = currentDate.toISOString().split('T')[0];

  this._newsService.getNews(date).subscribe((articles) => {
    if (articles.length) {
      this.articles = articles;
    } else {     
      const previousDate = new Date(currentDate);
      previousDate.setDate(currentDate.getDate() - 1);
      const previousDateString = previousDate.toISOString().split('T')[0];
      
      this._newsService.getNews(previousDateString).subscribe((articles) => {
        if (articles.length) {
          this.articles = articles;
        } else {
          this._newsService.getFetchNews().subscribe((articles) => {
            this.articles = articles;
          });
        }
      });
    }
  });
}

}
