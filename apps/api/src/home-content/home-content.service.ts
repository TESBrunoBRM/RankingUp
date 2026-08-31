import { Inject, Injectable } from '@nestjs/common';
import { parseStringPromise } from 'xml2js';
import { FALLBACK_NEWS, HOME_MESSAGES } from './home-content.constants';
import type { FitnessNewsItem, HomeContentResponse } from './home-content.types';

export const NEWS_FETCH = Symbol('NEWS_FETCH');

type FetchFunction = typeof fetch;

interface GoogleNewsItem {
  title?: string;
  link?: string;
  pubDate?: string;
  guid?: { _?: string } | string;
  source?: { _?: string } | string;
}

interface GoogleNewsFeed {
  rss?: {
    channel?: {
      item?: GoogleNewsItem | GoogleNewsItem[];
    };
  };
}

const FEED_QUERY = '("entrenamiento de fuerza" OR "actividad fisica" OR ejercicio) (salud OR rendimiento OR musculo) when:30d -producto -tienda -videojuego -smartwatch -reloj';
const FEED_URL = `https://news.google.com/rss/search?q=${encodeURIComponent(FEED_QUERY)}&hl=es-419&gl=CL&ceid=CL%3Aes-419`;
const FEED_TIMEOUT_MS = 2_500;
const CACHE_TTL_MS = 15 * 60 * 1_000;
const RELEVANT_TITLE = /(fitness|entren|ejercicio|actividad fisica|actividad física|fuerza|musculo|músculo|pilates|deporte|movimiento|salud)/i;
const COMMERCIAL_TITLE = /(comprar|oferta|set de|amazon|mercado libre|videojuego|smartwatch|galaxy watch)/i;
const BLOCKED_SOURCES = new Set(['electronic arts home page', 'samsung.com', 'casag.org.br', 'ejército de chile']);

const readNodeText = (value: GoogleNewsItem['source']): string => {
  if (typeof value === 'string') return value.trim();
  return value?._?.trim() ?? '';
};

const normalizeTitle = (title: string, source: string): string => {
  const suffix = source ? ` - ${source}` : '';
  return suffix && title.endsWith(suffix) ? title.slice(0, -suffix.length).trim() : title.trim();
};

@Injectable()
export class HomeContentService {
  private cachedResponse: { expiresAt: number; value: HomeContentResponse } | null = null;

  constructor(@Inject(NEWS_FETCH) private readonly fetchNews: FetchFunction) {}

  async getHomeContent(): Promise<HomeContentResponse> {
    if (this.cachedResponse && this.cachedResponse.expiresAt > Date.now()) {
      return this.cachedResponse.value;
    }

    const refreshedAt = new Date().toISOString();
    let news = FALLBACK_NEWS;
    let newsStatus: HomeContentResponse['newsStatus'] = 'fallback';

    try {
      const liveNews = await this.loadLiveNews();
      if (liveNews.length > 0) {
        news = liveNews;
        newsStatus = 'live';
      }
    } catch {
      // The editorial fallback keeps Home useful when the public feed is unavailable.
    }

    const value: HomeContentResponse = {
      messages: HOME_MESSAGES,
      news,
      newsStatus,
      refreshedAt,
    };
    this.cachedResponse = { value, expiresAt: Date.now() + CACHE_TTL_MS };
    return value;
  }

  private async loadLiveNews(): Promise<FitnessNewsItem[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);

    try {
      const response = await this.fetchNews(FEED_URL, {
        signal: controller.signal,
        headers: { 'User-Agent': 'RankingUp/1.0 fitness-news-reader' },
      });
      if (!response.ok) throw new Error(`News feed returned ${response.status}.`);

      const parsed = await parseStringPromise(await response.text(), {
        explicitArray: false,
        trim: true,
      }) as GoogleNewsFeed;
      const rawItems = parsed.rss?.channel?.item;
      const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

      return items
        .map((item, index): FitnessNewsItem | null => {
          const source = readNodeText(item.source) || 'Google Noticias';
          const title = normalizeTitle(item.title ?? '', source);
          const url = item.link?.trim() ?? '';
          const publishedDate = new Date(item.pubDate ?? '');
          if (Number.isNaN(publishedDate.getTime())) return null;
          const publishedAt = publishedDate.toISOString();
          const guid = readNodeText(item.guid) || `${publishedAt}-${index}`;
          if (
            !title
            || !url.startsWith('https://news.google.com/')
            || !RELEVANT_TITLE.test(title)
            || COMMERCIAL_TITLE.test(title)
            || BLOCKED_SOURCES.has(source.toLowerCase())
          ) return null;
          return { id: guid, title, source, publishedAt, url };
        })
        .filter((item): item is FitnessNewsItem => item !== null)
        .slice(0, 6);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
