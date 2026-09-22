import {readFile} from 'node:fs/promises';
import {parseCatalog} from './schema';
export async function loadCatalog(path:string,today:string){return parseCatalog(JSON.parse(await readFile(path,'utf8')),today);}
