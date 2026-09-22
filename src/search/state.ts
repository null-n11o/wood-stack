import type {Catalog} from '../catalog/types';
import type {WallInput} from '../calculator/wall';
import {toggleCompare} from './compare';
export type Filters={category:'board'|'top';q:string;species:string;finish:string;use:string;lmin:number|null;lmax:number|null;wmin:number|null;wmax:number|null;tmin:number|null;tmax:number|null;budget:number|null;sort:'name'|'checked'|'unit-price';page:number};
export type UrlState={v:1;filters:Filters;compare:string[];wall:WallInput|null;materialBudget:number|null};
export const vocab={species:['杉','桧','パイン','その他'],finish:['無塗装','研磨','塗装','エイジング'],use:['wall','shelf','desk','counter']};
export function defaultState():UrlState{return {v:1,filters:{category:'board',q:'',species:'',finish:'',use:'',lmin:null,lmax:null,wmin:null,wmax:null,tmin:null,tmax:null,budget:null,sort:'name',page:1},compare:[],wall:null,materialBudget:null};}
export function parseInteger(raw:string,min:number,max:number):number|null{const s=raw.replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xfee0)).trim();if(!/^\d+$/.test(s))return null;const n=Number(s);return Number.isSafeInteger(n)&&n>=min&&n<=max?n:null;}
export function encodeState(state:UrlState):string{const q=new URLSearchParams({v:'1'});for(const [k,v] of Object.entries(state.filters))if(v!==null&&v!=='')q.set(k,String(v));if(state.compare.length)q.set('compare',state.compare.join(','));if(state.wall)for(const [k,v]of Object.entries(state.wall))q.set(k,String(v));if(state.materialBudget!==null)q.set('mbudget',String(state.materialBudget));return q.toString();}
export function parseState(query:string,catalog:Catalog):{state:UrlState;warnings:string[]}{
 const state=defaultState(),warnings:string[]=[];const q=new URLSearchParams(query);
 const warn=(k:string)=>warnings.push(k+'の条件を無視しました');
 if(query.length>2048||(q.has('v')&&q.get('v')!=='1'))return {state,warnings:['URLの長さまたはバージョンが不正です']};
 for(const key of new Set(q.keys()))if(q.getAll(key).length>1)warnings.push(key+'は先頭の値を使用しました');
 const choice=<T extends string>(key:string,values:readonly T[],fallback:T):T=>{const raw=q.get(key);if(raw===null)return fallback;if(values.includes(raw as T))return raw as T;warn(key);return fallback;};
 state.filters.category=choice('category',['board','top'],'board');state.filters.sort=choice('sort',['name','checked','unit-price'],'name');
 const search=q.get('q')??'';if(search.length<=100)state.filters.q=search.normalize('NFKC').toLowerCase().trim();else warn('q');
 for(const key of ['species','finish','use'] as const)state.filters[key]=choice(key,['',...vocab[key]],'');
 const number=(key:string,min:number,max:number,fallback:number|null=null)=>{const raw=q.get(key);if(raw===null||raw==='')return fallback;const n=parseInteger(raw,min,max);if(n===null)warn(key);return n;};
 for(const key of ['lmin','lmax','wmin','wmax','tmin','tmax'] as const)state.filters[key]=number(key,1,10000);
 for(const [min,max]of [['lmin','lmax'],['wmin','wmax'],['tmin','tmax']] as const){const a=state.filters[min],b=state.filters[max];if(a!==null&&b!==null&&a>b){state.filters[min]=state.filters[max]=null;warn(min+'/'+max);}}
 state.filters.budget=number('budget',0,1000000);state.materialBudget=number('mbudget',0,1000000);state.filters.page=number('page',1,1000000)??1;
 for(const id of (q.get('compare')??'').split(',').filter(Boolean)){const result=toggleCompare(state.compare,id,catalog);state.compare=result.ids;if(result.reason)warnings.push(result.reason);}
 if(q.has('ww')||q.has('wh')){
  const ww=number('ww',100,10000),wh=number('wh',100,10000),trim=number('trim',0,20,5),kerf=number('kerf',0,10,3),reserve=number('reserve',0,30,10),extra=number('extra',0,100,0);
  if(ww===null||wh===null||trim===null||kerf===null||reserve===null||extra===null)warnings.push('壁の寸法・余裕の入力を確認してください');
  else state.wall={ww,wh,trim,kerf,reserve,extra,direction:choice('direction',['vertical','horizontal'],'vertical'),joint:choice('joint',['none','butt'],'none')};
 }
 return {state,warnings};
}
