import {spawnSync} from 'node:child_process';
if('WOOD_STACK_TEST_DATA' in process.env||'WOOD_STACK_TEST_BUILD' in process.env)throw new Error('通常buildに試験データ変数を渡せません');
const test=process.argv.includes('--test');
const result=spawnSync(process.execPath,['node_modules/astro/bin/astro.mjs','build'],{stdio:'inherit',env:{...process.env,...(test?{WOOD_STACK_TEST_DATA:'1',WOOD_STACK_TEST_BUILD:'1'}:{})}});
process.exit(result.status??1);
