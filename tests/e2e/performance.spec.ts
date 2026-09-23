import { test, expect } from '@playwright/test';
import { fixtureCatalog } from '../fixtures/catalog';
import { rows } from '../fixtures/rows';
test('500販売条件の検索と3件計算を各100回測定', async ({
  page,
  browserName,
}, info) => {
  await page.clock.setFixedTime(new Date('2026-09-22T03:00:00Z'));
  await page.route('**/catalog.json', (route) =>
    route.fulfill({ json: fixtureCatalog(rows(500)) }),
  );
  await page.goto('/products/');
  await expect(page.getByLabel('検索語', { exact: true })).toBeEnabled();
  const search = await page.evaluate(() => {
    const form = document.querySelector<HTMLFormElement>('#search-form')!,
      times = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      form.requestSubmit();
      times.push(performance.now() - start);
    }
    return times.sort((a, b) => a - b)[94];
  });
  await page.goto(
    '/calculator/wall/?compare=offer-0,offer-1,offer-2&ww=1800&wh=900&joint=butt',
  );
  await expect(page.getByText('材料費 4,000円', { exact: true })).toHaveCount(
    3,
  );
  const calculate = await page.evaluate(() => {
    const form = document.querySelector<HTMLFormElement>('#wall-form')!,
      times = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      form.requestSubmit();
      times.push(performance.now() - start);
    }
    return times.sort((a, b) => a - b)[94];
  });
  const report = {
    browser: browserName,
    offers: 500,
    iterations: 100,
    searchP95Ms: search,
    calculateP95Ms: calculate,
  };
  console.log(JSON.stringify(report));
  await info.attach('performance', {
    body: JSON.stringify(report),
    contentType: 'application/json',
  });
  expect(search).toBeLessThan(200);
  expect(calculate).toBeLessThan(200);
});
