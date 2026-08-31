export type HomeMessageKind = 'motivacion' | 'sabias-que';
export type NewsFeedStatus = 'live' | 'fallback';

export interface HomeMessage {
  id: string;
  kind: HomeMessageKind;
  text: string;
}

export interface FitnessNewsItem {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  url: string;
}

export interface HomeContentResponse {
  messages: HomeMessage[];
  news: FitnessNewsItem[];
  newsStatus: NewsFeedStatus;
  refreshedAt: string;
}
