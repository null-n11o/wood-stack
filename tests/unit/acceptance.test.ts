import { test, expect } from 'vitest';
import { estimateWall } from '../../src/calculator/wall';
import { calculateCost } from '../../src/offers/cost';
import { toPublicCatalog } from '../../src/catalog/public';
import { canShowImage } from '../../src/offers/links';
import { parseCatalog } from '../../src/catalog/schema';
import { searchCatalog } from '../../src/search/catalog';
import { defaultState } from '../../src/search/state';
import {
  fixtureCatalog,
  fixtureRow,
  today,
  wallInput,
} from '../fixtures/catalog';
import { rows } from '../fixtures/rows';
test.each([
  [1800, 900, 'vertical', 24800],
  [900, 1800, 'vertical', 18600],
  [2700, 2400, 'horizontal', 49600],
] as const)('toolboxの材料費 %i×%i %s', (ww, wh, direction, want) => {
  const row = fixtureRow({
    variant: {
      length: { kind: 'bounded', minMm: 909, maxMm: 911 },
      width: { kind: 'bounded', minMm: 134, maxMm: 136 },
      coverageWidth: { kind: 'bounded', minMm: 134, maxMm: 136 },
    },
    offer: { price: { kind: 'fixed', yen: 6200, tax: 'included' } },
  });
  expect(
    calculateCost(
      row,
      estimateWall(row, { ...wallInput, ww, wh, direction }),
      fixtureCatalog().evidence,
      today,
    ).materialHighYen,
  ).toBe(want);
});
test('Wの注文枠・Kの未確認寸法から購入目安を作らない', () => {
  const w = fixtureRow({
      variant: {
        length: { kind: 'selectable', minMm: 810, maxMm: 910, stepMm: 1 },
      },
      offer: { piecesPerUnit: null },
    }),
    k = fixtureRow({ variant: { length: { kind: 'unknown' } } });
  for (const r of [w, k])
    expect(estimateWall(r, wallInput).kind).toBe('unavailable');
});
test('Cの展示作品を検索候補に含めない', () =>
  expect(
    searchCatalog(
      fixtureCatalog([fixtureRow({ offer: { availability: 'display-only' } })]),
      defaultState().filters,
      today,
    ).total,
  ).toBe(0));
test('500販売条件を公開・検索できる', () => {
  const c = toPublicCatalog(fixtureCatalog(rows(500)), today);
  expect(c.offers).toHaveLength(500);
  expect(searchCatalog(c, defaultState().filters, today).total).toBe(500);
});
test('公開投影後も許諾済み画像は表示可能で根拠メモは漏れない', () => {
  const c = fixtureCatalog();
  c.images = [
    {
      id: 'image-a',
      localPath: '/images/a.jpg',
      sourceUrl: 'https://example.com/a.jpg',
      state: 'permitted',
      basis: '非公開の許諾記録',
      checkedAt: today,
      expiresAt: null,
      attribution: '撮影者',
    },
  ];
  c.products[0].imageId = 'image-a';
  const p = toPublicCatalog(c, today);
  expect(JSON.stringify(p)).not.toContain('非公開の許諾記録');
  expect(canShowImage(p.images[0], today)).toBe(true);
});
test('既知入数に購入単位の出典が必要', () => {
  const c = fixtureCatalog();
  c.evidence[0].fields = c.evidence[0].fields.filter(
    (f) => f !== 'purchase-unit',
  );
  expect(() => parseCatalog(c, today)).toThrow(/purchase/);
});
test('納品幅全体が収まらない寸法絞り込みを除外', () => {
  const c = fixtureCatalog([
    fixtureRow({
      variant: { width: { kind: 'bounded', minMm: 95, maxMm: 105 } },
    }),
  ]);
  expect(
    searchCatalog(c, { ...defaultState().filters, wmin: 100, wmax: 110 }, today)
      .total,
  ).toBe(0);
});
