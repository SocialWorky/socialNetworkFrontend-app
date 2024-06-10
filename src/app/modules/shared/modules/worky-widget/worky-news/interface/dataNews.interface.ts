export interface NewsArticle {
    title: string;
    description: string;
    url: string;
    urlToImage: string;
    publishedAt: string;
}

export interface NewsResponse {
    articles: NewsArticle[];
}
