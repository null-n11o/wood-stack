import {siteCatalog} from '../catalog/site';
export const prerender=true;
export async function GET(){return new Response(JSON.stringify(await siteCatalog()),{headers:{'Content-Type':'application/json; charset=utf-8'}});}
