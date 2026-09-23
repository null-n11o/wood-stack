import { z } from 'zod';
import type { Catalog } from '../catalog/types';
import {
  defaultState,
  encodeState,
  parseState,
  type Filters,
} from '../search/state';
import { lexical, normalize } from '../search/catalog';
import { date, httpsUrl } from '../catalog/schema';
export const articleSchema = z.strictObject({
  title: z.string().min(1),
  description: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category: z.enum(['board', 'top']),
  publishedAt: date,
  updatedAt: date,
  status: z.enum(['draft', 'published']),
  productIds: z.array(z.string()),
  searchPreset: z
    .record(z.string(), z.union([z.string(), z.number(), z.null()]))
    .nullable(),
  evidenceUrls: z.array(httpsUrl).min(1),
});
export type Article = z.infer<typeof articleSchema>;
export function presetHref(filters: Partial<Filters>): string {
  const s = defaultState();
  s.filters = { ...s.filters, ...filters, page: 1 };
  return '/products/?' + encodeState(s);
}
export function relatedArticleSlugs(
  productId: string,
  category: string,
  articles: Article[],
): string[] {
  return articles
    .filter(
      (a) =>
        a.status === 'published' &&
        (a.productIds.includes(productId) || a.category === category),
    )
    .sort(
      (a, b) =>
        Number(b.productIds.includes(productId)) -
          Number(a.productIds.includes(productId)) ||
        lexical(b.updatedAt, a.updatedAt) ||
        lexical(a.slug, b.slug),
    )
    .slice(0, 3)
    .map((a) => a.slug);
}
export function searchArticles(
  articles: Article[],
  q: string,
  category: string,
  page: number,
): { items: Article[]; total: number; page: number } {
  const tokens = normalize(q).split(/\s+/).filter(Boolean);
  const found = articles
    .filter(
      (a) =>
        a.status === 'published' &&
        (!category || a.category === category) &&
        tokens.every((t) =>
          normalize(a.title + ' ' + a.description).includes(t),
        ),
    )
    .sort(
      (a, b) => lexical(b.updatedAt, a.updatedAt) || lexical(a.slug, b.slug),
    );
  page = Math.max(1, Math.min(page, Math.ceil(found.length / 12) || 1));
  return {
    items: found.slice((page - 1) * 12, page * 12),
    total: found.length,
    page,
  };
}
export function validateArticles(
  input: Article[],
  catalog: Catalog,
  today: string,
): void {
  const articles = input.map((a) => articleSchema.parse(a)),
    slugs = new Set<string>();
  if (articles.filter((a) => a.status === 'published').length > 100)
    throw Error('公開記事は100件まで');
  for (const a of articles) {
    if (slugs.has(a.slug)) throw Error('duplicate article slug');
    slugs.add(a.slug);
    if (
      a.publishedAt > today ||
      a.updatedAt > today ||
      a.updatedAt < a.publishedAt
    )
      throw Error('article dates');
    if (a.status !== 'published') continue;
    if (
      a.productIds.some(
        (id) =>
          !catalog.products.some(
            (p) => p.id === id && p.status === 'published',
          ),
      )
    )
      throw Error('article product reference');
    if (a.searchPreset) {
      if (
        Object.keys(a.searchPreset).some((k) => !(k in defaultState().filters))
      )
        throw Error('unknown preset key');
      const parsed = parseState(
        new URL(
          presetHref(a.searchPreset as Partial<Filters>),
          'https://example.com',
        ).search,
        catalog,
      );
      if (parsed.warnings.length) throw Error(parsed.warnings.join(','));
    }
  }
}
