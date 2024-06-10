export interface NewsArticle {
    id:              number;
    article_id:      string;
    title:           string;
    link:            string;
    keywords:        string[];
    creator:         string[];
    video_url:       null;
    description:     string;
    content:         Content;
    pubDate:         Date;
    image_url:       string;
    source_id:       string;
    source_priority: number;
    source_url:      string;
    source_icon:     string;
    language:        Language;
    country:         Country[];
    category:        Category[];
    ai_tag:          AITag;
    sentiment:       AITag;
    sentiment_stats: AITag;
    ai_region:       AI;
    ai_org:          AI;
}

export type AI = "ONLY AVAILABLE IN CORPORATE PLANS";

export type AITag = "ONLY AVAILABLE IN PROFESSIONAL AND CORPORATE PLANS";

export type Category = "top" | "other";

export type Content = "ONLY AVAILABLE IN PAID PLANS";

export type Country = "chile";

export type Language = "spanish";