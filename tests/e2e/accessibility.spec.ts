import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-22T03:00:00Z'));
});
for (const width of [375, 1280])
  test(`${width}pxで横はみ出しなくキーボードで検索`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/products/');
    await expect(page.getByLabel('検索語', { exact: true })).toBeEnabled();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: '本文へ移動' })).toBeFocused();
    await page.keyboard.press('Enter');
    await page.getByLabel('検索語', { exact: true }).focus();
    await page.keyboard.type('A');
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('status').filter({ hasText: '1件' }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`search-${width}.png`),
      fullPage: true,
    });
    await page.goto('/compare/?compare=offer-a,offer-b,offer-c');
    await expect(page.getByRole('table')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`compare-${width}.png`),
      fullPage: true,
    });
  });
test('200%文字拡大でも計算条件を操作', async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(
    '/calculator/wall/?compare=offer-a&ww=1800&wh=900&joint=butt',
  );
  await expect(page.getByText('材料費 4,000円', { exact: true })).toBeVisible();
  await page.addStyleTag({ content: 'html{font-size:200%}' });
  await expect(
    page.getByRole('button', { name: '計算する', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath('wall-200.png'),
    fullPage: true,
  });
});
