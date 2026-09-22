import { expect, test } from 'vitest';
import { purchaseLink, canShowImage } from '../../src/offers/links';
import { fixtureRow, today } from '../fixtures/catalog';
import type { AdLink } from '../../src/catalog/types';
const approved: AdLink = {
  offerId: 'offer-a',
  state: 'approved',
  url: 'https://ads.example/a',
  allowedHosts: ['ads.example'],
  checkedAt: today,
  expiresAt: null,
};
test('承認済み広告だけを表示', () => {
  const r = fixtureRow();
  expect(purchaseLink(r.offer, r.seller, approved, today)).toMatchObject({
    href: approved.url,
    rel: 'sponsored noopener',
  });
});
test.each([
  'pending',
  'suspended',
  'expired',
  'host',
  'mismatch',
  'future',
  'credentials',
] as const)('%sでも通常リンクを保持', (kind) => {
  const r = fixtureRow(),
    ad = { ...approved };
  if (kind === 'pending' || kind === 'suspended') ad.state = kind;
  if (kind === 'expired') ad.expiresAt = '2026-09-21';
  if (kind === 'host') ad.url = 'https://evil.example/a';
  if (kind === 'mismatch') ad.offerId = 'offer-b';
  if (kind === 'future') ad.checkedAt = '2026-09-23';
  if (kind === 'credentials') ad.url = 'https://user@ads.example/a';
  expect(purchaseLink(r.offer, r.seller, ad, today)).toEqual({
    href: r.offer.purchaseUrl,
    label: '販売店で確認',
    rel: 'noopener',
  });
});
test('画像は許諾と有効期限とローカルファイル指定が必要', () => {
  const img = {
    id: 'image-a',
    localPath: '/images/a.jpg',
    sourceUrl: 'https://example.com/a.jpg',
    state: 'permitted' as const,
    basis: 'permission',
    checkedAt: today,
    expiresAt: null,
    attribution: null,
  };
  expect(canShowImage(img, today)).toBe(true);
  expect(canShowImage({ ...img, state: 'unknown' }, today)).toBe(false);
  expect(canShowImage({ ...img, expiresAt: '2026-09-21' }, today)).toBe(false);
});
