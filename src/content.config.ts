import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { articleSchema } from './articles/related';
const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: articleSchema,
});
export const collections = { articles };
