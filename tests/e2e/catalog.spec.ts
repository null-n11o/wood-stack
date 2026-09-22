import { expect, test } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-22T03:00:00Z'));
});
test('検索から比較・壁材計算へ進み共有URLを再現', async ({ page }) => {
  await page.goto('/products/?v=1&category=board');
  await page.getByLabel('検索語', { exact: true }).fill('A板');
  await page.getByRole('button', { name: '条件を適用', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: '1件' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'A板を比較に追加', exact: true })
    .click();
  await page
    .getByRole('link', { name: '比較を見る', exact: true })
    .first()
    .click();
  await expect(page.getByRole('columnheader', { name: /A板/ })).toBeVisible();
  await page
    .getByRole('link', { name: '壁材の数量を計算', exact: true })
    .click();
  await page.getByLabel('壁の幅（mm）', { exact: true }).fill('1800');
  await page.getByLabel('壁の高さ（mm）', { exact: true }).fill('900');
  await page.getByLabel('長手方向の継ぎ', { exact: true }).selectOption('butt');
  await page.getByRole('button', { name: '計算する', exact: true }).click();
  await expect(page.getByText('材料費 4,000円', { exact: true })).toBeVisible();
  await expect(
    page.getByText('送料未確認', { exact: true }).first(),
  ).toBeVisible();
  const url = page.url();
  await page.reload();
  await expect(page.getByText('材料費 4,000円', { exact: true })).toBeVisible();
  expect(page.url()).toBe(url);
  await page.getByLabel('壁の幅（mm）', { exact: true }).fill('1e3');
  await page.getByRole('button', { name: '計算する', exact: true }).click();
  await expect(page.getByText('材料費 4,000円', { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByRole('alert')).not.toBeEmpty();
});
test('0件・全解除・戻る操作', async ({ page }) => {
  await page.goto('/products/');
  await page.getByLabel('検索語', { exact: true }).fill('存在しない商品');
  await page.getByRole('button', { name: '条件を適用', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: '0件' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '全解除', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: '4件' }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel('検索語', { exact: true })).toHaveValue(
    '存在しない商品',
  );
});
test('比較4件目と異カテゴリーを拒否', async ({ page }) => {
  await page.goto('/products/');
  for (const name of ['A板', 'B板', 'C板', 'D板'])
    await page
      .getByRole('button', { name: name + 'を比較に追加', exact: true })
      .click();
  await expect(
    page.getByRole('status').filter({ hasText: '3件まで' }),
  ).toBeVisible();
  await page.getByLabel('カテゴリー', { exact: true }).selectOption('top');
  await page.getByRole('button', { name: '条件を適用', exact: true }).click();
  await page
    .getByRole('button', { name: '天板Aを比較に追加', exact: true })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: /3件まで|分けて/ }),
  ).toBeVisible();
});
test('空比較を案内', async ({ page }) => {
  await page.goto('/compare/');
  await expect(
    page.getByText('比較する商品を追加してください', { exact: true }),
  ).toBeVisible();
});
test('JSON読込失敗でも静的一覧が残り再試行できる', async ({ page }) => {
  await page.route('**/catalog.json', (route) => route.abort());
  await page.goto('/products/');
  await expect(
    page.getByRole('button', { name: '再試行', exact: true }),
  ).toBeVisible();
  await expect(page.locator('#static-catalog')).toContainText('A板');
  await page.unroute('**/catalog.json');
  await page.getByRole('button', { name: '再試行', exact: true }).click();
  await expect(page.getByLabel('検索語', { exact: true })).toBeEnabled();
});
test('JSなしでも詳細と通常購入先を読める', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4322/products/board-a/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'A板' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: '販売店で確認', exact: true }),
  ).toHaveAttribute('href', 'https://example.com/board');
  await context.close();
});
test('詳細の選択条件を計算へ渡しスキップリンクを保持', async ({ page }) => {
  await page.goto('/products/board-a/');
  await page
    .getByLabel('比較・計算する販売条件', { exact: true })
    .selectOption('offer-a');
  await page
    .getByRole('link', { name: 'この販売条件で壁材を計算', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'A板を外す' })).toBeVisible();
  await expect(page.getByRole('link', { name: '本文へ移動' })).toHaveAttribute(
    'href',
    '#main',
  );
});
test('許諾済みの画像とクレジットを表示し期限切れなら出さない', async ({
  page,
}) => {
  const { e2eCatalog } = await import('../fixtures/catalog');
  const c = e2eCatalog();
  c.images = [
    {
      id: 'image-a',
      localPath: '/images/a.jpg',
      sourceUrl: 'https://example.com/a.jpg',
      state: 'permitted',
      basis: '利用許諾確認済み',
      checkedAt: '2026-09-22',
      expiresAt: null,
      attribution: '撮影者A',
    },
  ];
  c.products[0].imageId = 'image-a';
  await page.route('**/images/a.jpg', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="tan"/></svg>',
    }),
  );
  await page.route('**/catalog.json', (route) => route.fulfill({ json: c }));
  await page.goto('/products/');
  await expect(
    page.getByRole('img', { name: 'A板', exact: true }),
  ).toHaveAttribute('src', '/images/a.jpg');
  await expect(page.getByText('撮影者A', { exact: true })).toBeVisible();
  c.images[0].state = 'expired';
  await page.reload();
  await expect(page.getByLabel('検索語', { exact: true })).toBeEnabled();
  await expect(page.getByRole('img', { name: 'A板', exact: true })).toHaveCount(
    0,
  );
});

test('比較への追加状態を商品詳細への移動でも保持する', async ({ page }) => {
  await page.goto('/products/');
  await page
    .getByRole('button', { name: 'A板を比較に追加', exact: true })
    .click();
  await page.getByRole('link', { name: 'A板', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'A板を外す', exact: true }),
  ).toBeVisible();
});

test('金額上限を超える計算で部分的な購入数量を出さない', async ({ page }) => {
  const { e2eCatalog } = await import('../fixtures/catalog');
  const c = e2eCatalog();
  c.offers[0].price = { kind: 'fixed', yen: 1000000, tax: 'included' };
  await page.route('**/catalog.json', (route) => route.fulfill({ json: c }));
  await page.goto(
    '/calculator/wall/?v=1&compare=offer-a&ww=10000&wh=10000&direction=vertical&joint=butt&trim=5&kerf=3&reserve=10&extra=0',
  );
  await expect(
    page.getByText('材料費が計算上限を超えています', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('#estimate-results')).not.toContainText('必要枚数');
});
