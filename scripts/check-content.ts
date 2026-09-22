import { readdir, readFile } from 'node:fs/promises';
import matter from 'gray-matter';
import { articleSchema, validateArticles } from '../src/articles/related';
import { loadCatalog } from '../src/catalog/repository';
import { jstToday } from '../src/offers/freshness';
const paths = (await readdir('src/content/articles')).filter((p) =>
  p.endsWith('.md'),
);
const articles = await Promise.all(
  paths.map(async (p) =>
    articleSchema.parse(
      matter(await readFile('src/content/articles/' + p, 'utf8')).data,
    ),
  ),
);
validateArticles(
  articles,
  await loadCatalog('src/data/catalog.json', jstToday()),
  jstToday(),
);
console.log(`Content verified: ${articles.length} articles`);
