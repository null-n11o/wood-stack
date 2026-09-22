import { expect, test } from 'vitest';
import { toggleCompare } from '../../src/search/compare';
import { fixtureCatalog } from '../fixtures/catalog';
import { rows } from '../fixtures/rows';
test('同一組の再追加を無視し4件目を拒否', () => {
  const c = fixtureCatalog(rows(4));
  expect(toggleCompare(['offer-0'], 'offer-0', c).ids).toEqual(['offer-0']);
  expect(
    toggleCompare(['offer-0', 'offer-1', 'offer-2'], 'offer-3', c).ids,
  ).toHaveLength(3);
  expect(
    toggleCompare(['offer-0', 'offer-1', 'offer-2'], 'offer-3', c).reason,
  ).not.toBeNull();
});
test('異カテゴリー追加・非公開IDを拒否', () => {
  const c = fixtureCatalog(rows(2));
  c.products[1].category = 'top';
  expect(toggleCompare(['offer-0'], 'offer-1', c).ids).toEqual(['offer-0']);
  c.products[1].status = 'draft';
  expect(toggleCompare([], 'offer-1', c).ids).toEqual([]);
});
