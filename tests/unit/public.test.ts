import { expect, test } from 'vitest';
import { toPublicCatalog } from '../../src/catalog/public';
import { fixtureCatalog, fixtureRow, today } from '../fixtures/catalog';
import { rows } from '../fixtures/rows';
test('非公開商品と関連情報・運営メモ・無許可画像を出さない', () => {
  const c = fixtureCatalog([
    fixtureRow(),
    fixtureRow({
      product: { id: 'private', slug: 'private', status: 'draft' },
      variant: { id: 'private-v', productId: 'private' },
      offer: { id: 'private-o', variantId: 'private-v' },
    }),
  ]);
  c.images = [
    {
      id: 'image-a',
      localPath: '/images/secret.jpg',
      sourceUrl: 'https://example.com/secret.jpg',
      state: 'unknown',
      basis: 'private memo',
      checkedAt: null,
      expiresAt: null,
      attribution: null,
    },
  ];
  c.products[0].imageId = 'image-a';
  const p = toPublicCatalog(c, today),
    s = JSON.stringify(p);
  expect(s).not.toContain('private');
  expect(s).not.toContain('secret.jpg');
  expect(s).not.toContain('合成fixture');
  expect(p.offers).toHaveLength(1);
  expect(p.products[0].imageId).toBeNull();
  expect(p.evidence[0].method).toBe('direct');
});
test('500販売条件と1MiBを超える公開JSONを拒否', () => {
  expect(() => toPublicCatalog(fixtureCatalog(rows(501)), today)).toThrow(
    /500/,
  );
  const c = fixtureCatalog();
  c.products[0].description = '木'.repeat(400000);
  expect(() => toPublicCatalog(c, today)).toThrow(/1MiB/);
});
