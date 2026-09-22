import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { pathToFileURL } from 'node:url';
async function files(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory()
          ? files(join(dir, e.name))
          : Promise.resolve([join(dir, e.name)]),
      ),
    )
  ).flat();
}
export async function checkLinks(root: string): Promise<number> {
  let count = 0;
  const base = resolve(root);
  for (const path of (await files(base)).filter((p) => p.endsWith('.html'))) {
    const html = await readFile(path, 'utf8');
    for (const match of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
      count++;
      const raw = match[1].replaceAll('&amp;', '&');
      const relativePath =
        '/' + relative(base, path).replace(/index\.html$/, '');
      const url = new URL(raw, 'https://local.test' + relativePath);
      if (url.origin !== 'https://local.test') {
        if (url.protocol !== 'https:' || url.username || url.password)
          throw Error(path + ': invalid external URL ' + raw);
        continue;
      }
      const target = resolve(base, '.' + decodeURIComponent(url.pathname));
      if (target !== base && !target.startsWith(base + '/'))
        throw Error('outside build: ' + raw);
      let actual = target;
      try {
        if ((await stat(actual)).isDirectory())
          actual = join(actual, 'index.html');
        await stat(actual);
      } catch {
        throw Error(path + ': missing ' + raw);
      }
      if (url.hash) {
        const targetHtml = await readFile(actual, 'utf8'),
          id = decodeURIComponent(url.hash.slice(1));
        if (
          !targetHtml.includes('id="' + id + '"') &&
          !targetHtml.includes("id='" + id + "'")
        )
          throw Error(path + ': missing anchor ' + raw);
      }
    }
  }
  return count;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  checkLinks('dist')
    .then((n) => console.log(`Generated links verified: ${n}`))
    .catch((e) => {
      console.error(String(e));
      process.exitCode = 1;
    });
