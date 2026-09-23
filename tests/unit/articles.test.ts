import { expect, test } from 'vitest';
import {
  presetHref,
  relatedArticleSlugs,
  searchArticles,
  validateArticles,
  type Article,
} from '../../src/articles/related';
import { parseState } from '../../src/search/state';
import { fixtureCatalog, today } from '../fixtures/catalog';
const article = (slug: string): Article => ({
  title: '数量とセット',
  description: '壁材の計算',
  slug,
  category: 'board',
  publishedAt: today,
  updatedAt: today,
  status: 'published',
  productIds: [],
  searchPreset: { category: 'board', finish: '無塗装' },
  evidenceUrls: ['https://example.com/'],
});
test('記事プリセットを検索へ引き継ぐ', () =>
  expect(
    parseState(
      new URL(
        presetHref({ category: 'board', finish: '無塗装' }),
        'https://example.com',
      ).search,
      fixtureCatalog(),
    ).state.filters.finish,
  ).toBe('無塗装'));
test('商品一致をカテゴリー一致より優先して同点はslug順', () => {
  const a = article('z'),
    b = article('b'),
    c = article('a');
  a.productIds = ['board-a'];
  expect(relatedArticleSlugs('board-a', 'board', [b, c, a])).toEqual([
    'z',
    'a',
    'b',
  ]);
});
test('記事AND検索・0件・12件ページ', () => {
  const articles = Array.from({ length: 13 }, (_, i) =>
    article('article-' + i),
  );
  expect(searchArticles(articles, '数量 計算', '', 1).items).toHaveLength(12);
  expect(searchArticles(articles, '数量 計算', '', 2).items).toHaveLength(1);
  expect(searchArticles(articles, '存在しない', '', 1).total).toBe(0);
});
test.each(['missing', 'draft', 'future', 'preset', 'source'] as const)(
  '%sの公開記事はビルドを止める',
  (kind) => {
    const a = article('a'),
      c = fixtureCatalog();
    if (kind === 'missing') a.productIds = ['missing'];
    if (kind === 'draft') {
      a.productIds = ['board-a'];
      c.products[0].status = 'draft';
    }
    if (kind === 'future') a.updatedAt = '2026-09-23';
    if (kind === 'preset') a.searchPreset = { finish: '未定義' };
    if (kind === 'source') a.evidenceUrls = ['http://example.com/'];
    expect(() => validateArticles([a], c, today)).toThrow();
  },
);
