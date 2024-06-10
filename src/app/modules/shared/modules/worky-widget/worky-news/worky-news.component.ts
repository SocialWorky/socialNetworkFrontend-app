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
    const date = new Date().toISOString().split('T')[0];
    this._newsService.getNews(date).subscribe((articles) => {
      if (articles.length > 0) {
        this.articles = articles;
      } else {
        this._newsService.getFetchNews().subscribe((articles) => {
          this.articles = articles;
        });
      }
    });
  }
}
