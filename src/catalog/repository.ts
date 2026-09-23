import { readFile } from 'node:fs/promises';
import { parseCatalog } from './schema';
export async function loadCatalog(path: string, today: string) {
  if (
    process.env.WOOD_STACK_TEST_DATA === '1' &&
    path === 'src/data/catalog.json'
  ) {
    if (process.env.WOOD_STACK_TEST_BUILD !== '1')
      throw new Error('fixture build required');
    const { e2eCatalog } = await import('../../tests/fixtures/catalog');
    return parseCatalog(e2eCatalog(), '2026-09-22');
  }
  return parseCatalog(JSON.parse(await readFile(path, 'utf8')), today);
}
