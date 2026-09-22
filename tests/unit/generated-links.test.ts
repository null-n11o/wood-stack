import { expect, test } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkLinks } from '../../scripts/check-links';
test('生成HTMLのローカル参照切れを検出する', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wood-stack-links-'));
  try {
    await writeFile(join(dir, 'index.html'), '<a href="/missing/">link</a>');
    await expect(checkLinks(dir)).rejects.toThrow(/missing/);
    await writeFile(
      join(dir, 'index.html'),
      '<a href="https://example.com/">external</a><a href="#main">skip</a><main id="main"></main>',
    );
    await expect(checkLinks(dir)).resolves.toBe(2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
