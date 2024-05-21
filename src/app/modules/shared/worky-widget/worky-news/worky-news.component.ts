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

  constructor(private newsService: NewsService) {}

  ngOnInit() {
    this.newsService.getTopSportsHeadlines().subscribe((response) => {
      console.log('Response from API:', response);
      this.articles = response.articles;
    });
  }     
}
