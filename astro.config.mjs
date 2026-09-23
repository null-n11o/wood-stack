import { defineConfig } from 'astro/config';
const test = process.env.WOOD_STACK_TEST_DATA === '1';
if (test && process.env.WOOD_STACK_TEST_BUILD !== '1')
  throw new Error('Use npm run build:test for fixtures');
export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  outDir: test ? './dist-test' : './dist',
});
