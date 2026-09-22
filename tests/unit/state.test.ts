import { expect, test } from 'vitest';
import {
  defaultState,
  parseState,
  encodeState,
  parseInteger,
} from '../../src/search/state';
import { fixtureCatalog, wallInput } from '../fixtures/catalog';
test('日本語・壁・比較・別々の予算をURLで復元', () => {
  const s = defaultState();
  s.filters.q = '杉 無塗装';
  s.compare = ['offer-a'];
  s.wall = wallInput;
  s.materialBudget = 40000;
  s.filters.budget = 5000;
  expect(parseState(encodeState(s), fixtureCatalog()).state).toEqual(s);
});
test.each(['1e3', '1,000', '1.0', '-1', 'Infinity'])(
  '整数文字列以外%sを拒否',
  (s) => expect(parseInteger(s, 0, 10000)).toBeNull(),
);
test('全角数字と前後空白を許容', () =>
  expect(parseInteger(' １０００ ', 0, 10000)).toBe(1000));
test('未知v・過大URLを通知して初期化', () => {
  for (const q of ['v=2', 'q=' + 'x'.repeat(2050)]) {
    const r = parseState(q, fixtureCatalog());
    expect(r.state).toEqual(defaultState());
    expect(r.warnings.length).toBeGreaterThan(0);
  }
});
test('不正数値・範囲・未知IDを除き重複queryは先頭を採る', () => {
  const r = parseState(
    'q=杉&q=桧&lmin=100&lmax=10&budget=1e3&compare=offer-a,missing,offer-a',
    fixtureCatalog(),
  );
  expect(r.state.filters.q).toBe('杉');
  expect(r.state.filters.lmin).toBeNull();
  expect(r.state.filters.budget).toBeNull();
  expect(r.state.compare).toEqual(['offer-a']);
  expect(r.warnings.length).toBeGreaterThan(0);
});
test('壁寸法の片側欠落なら旧計算を復元しない', () =>
  expect(parseState('ww=1800', fixtureCatalog()).state.wall).toBeNull());
