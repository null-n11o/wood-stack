import { expect, test } from '@playwright/test';

test('トップから板材へ移動し現在位置を確認できる', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByText('AI生成のイメージ。掲載商品の写真ではありません。', {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('link', { name: '板材を探す', exact: true }).click();
  await expect(
    page
      .getByRole('navigation', { name: 'メイン' })
      .getByRole('link', { name: '商品を探す', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(page.getByLabel('カテゴリー', { exact: true })).toHaveValue(
    'board',
  );
});

for (const width of [375, 1280]) {
  test(`${width}pxのトップと詳細で横はみ出しを防ぐ`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/products/board-a/']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(path === '/' ? 'home.png' : 'detail.png'),
        fullPage: true,
      });
    }
  });
}

test('寸法条件を必要なときに開き、共有URLから復元できる', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/products/');
  await expect(
    page.getByLabel('長さの下限（mm）', { exact: true }),
  ).not.toBeVisible();
  await page.getByText('寸法と予算で絞り込む', { exact: true }).click();
  await page.getByLabel('長さの下限（mm）', { exact: true }).fill('500');
  await page.getByRole('button', { name: '条件を適用', exact: true }).click();
  await expect(page).toHaveURL(/lmin=500/);
  await page.reload();
  await expect(
    page.getByLabel('長さの下限（mm）', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel('長さの下限（mm）', { exact: true }),
  ).toHaveValue('500');
});

test('寸法の不正な共有URLでも案内先の入力欄を開く', async ({ page }) => {
  await page.goto('/products/?v=1&lmin=invalid');
  await expect(page.getByRole('alert')).not.toBeEmpty();
  await expect(
    page.getByLabel('長さの下限（mm）', { exact: true }),
  ).toBeVisible();
});
