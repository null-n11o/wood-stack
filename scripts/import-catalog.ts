import {createHash,randomUUID} from 'node:crypto';
import {readFile,writeFile,rename,unlink,stat,open} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {catalogSchema,parseCatalog} from '../src/catalog/schema';
import type {Catalog} from '../src/catalog/types';
const hash=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
async function current(path:string){try{return await readFile(path);}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return Buffer.alloc(0);throw e;}}
export async function importCatalog(inputPath:string,targetPath:string,options:{apply:boolean;expectedSha?:string;today:string}):Promise<{sha:string;added:string[];updated:string[]}>{
 if((await stat(inputPath)).size>10*1024*1024)throw new Error('input exceeds 10MiB');
 const bytes=await readFile(inputPath);if(bytes.length>10*1024*1024)throw new Error('input exceeds 10MiB');
 const incoming=catalogSchema.parse(JSON.parse(bytes.toString('utf8')));
 const old=await current(targetPath),sha=hash(old);
 const base:Catalog=old.length?parseCatalog(JSON.parse(old.toString('utf8')),options.today):{schemaVersion:1,sellers:[],products:[],variants:[],offers:[],adLinks:[],evidence:[],images:[]};
 const added:string[]=[],updated:string[]=[];
 const merged=structuredClone(base);
 for(const key of ['sellers','products','variants','offers','adLinks','evidence','images'] as const){
  const identifier=(x:Record<string,unknown>)=>String(key==='adLinks'?x.offerId:x.id);
  const rows=new Map<string,Record<string,unknown>>(base[key].map(x=>[identifier(x),x]));
  const seen=new Set<string>();
  for(const x of incoming[key]){const id=identifier(x);if(seen.has(id))throw new Error(key+': duplicate '+id);seen.add(id);const before=rows.get(id);if(!before)added.push(key+':'+id);else if(JSON.stringify(before)!==JSON.stringify(x))updated.push(key+':'+id);rows.set(id,x);}
  // Each array is structurally validated again below after the ID-preserving merge.
  (merged as unknown as Record<string,unknown>)[key]=[...rows.values()];
 }
 const validated=parseCatalog(merged,options.today);
 if(!options.apply)return {sha,added,updated};
 if(options.expectedSha!==sha)throw new Error('catalog changed: expectedSha mismatch');
 const lockPath=targetPath+'.lock';const lock=await open(lockPath,'wx');
 const temp=targetPath+'.'+randomUUID()+'.tmp';
 try{
  if(hash(await current(targetPath))!==sha)throw new Error('catalog changed');
  const output=JSON.stringify(validated,null,2)+'\n';
  await writeFile(temp,output,{flag:'wx'});
  if(hash(await current(targetPath))!==sha)throw new Error('catalog changed');
  await rename(temp,targetPath);
  const stored=hash(await readFile(targetPath));if(stored!==hash(output))throw new Error('saved catalog verification failed; inspect saved result before retry');
  return {sha:stored,added,updated};
 }finally{await unlink(temp).catch(e=>{if(e.code!=='ENOENT')throw e;});await lock.close();await unlink(lockPath);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=process.argv.slice(2);const value=(key:string)=>{const i=args.indexOf(key);return i<0?undefined:args[i+1];};
 const input=value('--input');
 if(!input){console.error('Usage: npm run import:catalog -- --input file [--apply --expected-sha sha]');process.exitCode=1;}
 else importCatalog(input,'src/data/catalog.json',{apply:args.includes('--apply'),expectedSha:value('--expected-sha'),today:new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'})}).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(String(error));process.exitCode=1;});
}
