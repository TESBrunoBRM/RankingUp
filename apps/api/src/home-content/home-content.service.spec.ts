import { Test } from '@nestjs/testing';
import { FALLBACK_NEWS } from './home-content.constants';
import { HomeContentService, NEWS_FETCH } from './home-content.service';

const RSS_XML = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"><channel>
  <item>
    <title>Set de discos fitness en oferta - casag.org.br</title>
    <link>https://news.google.com/rss/articles/commercial</link>
    <guid>news-commercial</guid>
    <pubDate>Wed, 12 Aug 2026 11:00:00 GMT</pubDate>
    <source url="https://casag.org.br">casag.org.br</source>
  </item>
  <item>
    <title>Entrenar fuerza mejora la salud - Diario Fitness</title>
    <link>https://news.google.com/rss/articles/example</link>
    <guid>news-1</guid>
    <pubDate>Wed, 12 Aug 2026 10:00:00 GMT</pubDate>
    <source url="https://example.com">Diario Fitness</source>
  </item>
</channel></rss>`;

describe('HomeContentService', () => {
  const fetchMock = jest.fn();
  let service: HomeContentService;

  beforeEach(async () => {
    fetchMock.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        HomeContentService,
        { provide: NEWS_FETCH, useValue: fetchMock },
      ],
    }).compile();
    service = moduleRef.get(HomeContentService);
  });

  it('normalizes live RSS news and removes the duplicated source suffix', async () => {
    fetchMock.mockResolvedValue({ ok: true, text: async () => RSS_XML });

    const result = await service.getHomeContent();

    expect(result.newsStatus).toBe('live');
    expect(result.news[0]).toMatchObject({
      id: 'news-1',
      title: 'Entrenar fuerza mejora la salud',
      source: 'Diario Fitness',
    });
    expect(result.news).toHaveLength(1);
    expect(result.messages.length).toBeGreaterThan(3);
  });

  it('uses the cached response instead of requesting the feed twice', async () => {
    fetchMock.mockResolvedValue({ ok: true, text: async () => RSS_XML });

    const first = await service.getHomeContent();
    const second = await service.getHomeContent();

    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns editorial fallback when the feed is unavailable', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));

    const result = await service.getHomeContent();

    expect(result.newsStatus).toBe('fallback');
    expect(result.news).toEqual(FALLBACK_NEWS);
  });

  it('returns editorial fallback when the feed has no valid items', async () => {
    fetchMock.mockResolvedValue({ ok: true, text: async () => '<rss><channel /></rss>' });

    const result = await service.getHomeContent();

    expect(result.newsStatus).toBe('fallback');
    expect(result.news).toHaveLength(FALLBACK_NEWS.length);
  });
});
