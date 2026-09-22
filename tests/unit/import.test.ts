import { expect, test, afterEach } from 'vitest';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importCatalog } from '../../scripts/import-catalog';
import { fixtureCatalog, today } from '../fixtures/catalog';
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })),
  );
});
async function setup() {
  const d = await mkdtemp(join(tmpdir(), 'wood-stack-'));
  dirs.push(d);
  const target = join(d, 'catalog.json'),
    input = join(d, 'input.json');
  await writeFile(target, JSON.stringify(fixtureCatalog()));
  await writeFile(input, JSON.stringify(fixtureCatalog()));
  return { target, input };
}
test('dry-runは元バイトを保持し適用後に同IDを更新', async () => {
  const { target, input } = await setup();
  const old = await readFile(target);
  const c = fixtureCatalog();
  c.products[0].name = '改訂';
  await writeFile(input, JSON.stringify(c));
  const r = await importCatalog(input, target, { apply: false, today });
  expect(r.updated).toContain('products:board-a');
  expect(await readFile(target)).toEqual(old);
  await importCatalog(input, target, {
    apply: true,
    expectedSha: r.sha,
    today,
  });
  expect(JSON.parse(await readFile(target, 'utf8')).products[0].name).toBe(
    '改訂',
  );
});
test('欠落行は削除しない', async () => {
  const { target, input } = await setup();
  const c = fixtureCatalog();
  c.products = [];
  c.variants = [];
  c.offers = [];
  await writeFile(input, JSON.stringify(c));
  const r = await importCatalog(input, target, { apply: false, today });
  await importCatalog(input, target, {
    apply: true,
    expectedSha: r.sha,
    today,
  });
  expect(JSON.parse(await readFile(target, 'utf8')).products).toHaveLength(1);
});
test.each(['invalid', 'sha', 'oversize'] as const)(
  '%sで全件不変',
  async (kind) => {
    const { target, input } = await setup();
    const old = await readFile(target);
    if (kind === 'invalid') {
      const c = fixtureCatalog();
      c.offers.push({ ...c.offers[0], id: 'broken', variantId: 'missing' });
      await writeFile(input, JSON.stringify(c));
    }
    if (kind === 'oversize')
      await writeFile(input, ' '.repeat(10 * 1024 * 1024 + 1));
    await expect(
      importCatalog(input, target, {
        apply: true,
        expectedSha: 'wrong',
        today,
      }),
    ).rejects.toThrow();
    expect(await readFile(target)).toEqual(old);
  },
);
test('初回は空バイトSHAを提示して作成', async () => {
  const { target, input } = await setup();
  await rm(target);
  const r = await importCatalog(input, target, { apply: false, today });
  expect(r.sha).toBe(
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  );
  expect(r.added).toContain('offers:offer-a');
  await importCatalog(input, target, {
    apply: true,
    expectedSha: r.sha,
    today,
  });
  expect(JSON.parse(await readFile(target, 'utf8')).schemaVersion).toBe(1);
});
test('書込ロック取得失敗なら既存台帳を保持', async () => {
  const { target, input } = await setup();
  const old = await readFile(target);
  const r = await importCatalog(input, target, { apply: false, today });
  await writeFile(target + '.lock', 'another importer');
  await expect(
    importCatalog(input, target, { apply: true, expectedSha: r.sha, today }),
  ).rejects.toThrow();
  expect(await readFile(target)).toEqual(old);
});
