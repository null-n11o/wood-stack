import {z} from 'zod';
const id=z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const text=z.string().trim().min(1);
const int=z.number().int().safe().min(1).max(100000000);
const money=z.number().int().safe().min(0).max(100000000);
export const httpsUrl=z.string().refine(s=>{try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password&&!!u.hostname;}catch{return false;}},'HTTPS URL required');
const host=text.refine(s=>{try{return new URL('https://'+s).host===s&&!s.includes(':')&&!s.includes('@');}catch{return false;}},'invalid host');
export const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>{const d=new Date(s+'T00:00:00Z');return !isNaN(+d)&&d.toISOString().slice(0,10)===s;},'invalid date');
export const dimension=z.discriminatedUnion('kind',[
 z.strictObject({kind:z.literal('bounded'),minMm:int,maxMm:int}),
 z.strictObject({kind:z.literal('nominal'),mm:int,note:text}),
 z.strictObject({kind:z.literal('selectable'),minMm:int,maxMm:int,stepMm:int}),
 z.strictObject({kind:z.literal('unknown')})
]).refine(d=>!('minMm'in d)||d.minMm<=d.maxMm,'dimension range');
export const price=z.discriminatedUnion('kind',[
 z.strictObject({kind:z.literal('fixed'),yen:money,tax:z.enum(['included','excluded','unknown'])}),
 z.strictObject({kind:z.literal('from'),yen:money,tax:z.enum(['included','excluded','unknown'])}),
 z.strictObject({kind:z.literal('quote')}),z.strictObject({kind:z.literal('unknown')})
]);
export const shipping=z.discriminatedUnion('kind',[
 z.strictObject({kind:z.literal('free'),regions:z.array(text).min(1),maxUnits:int.nullable(),evidenceId:id}),
 z.strictObject({kind:z.literal('fixed'),yen:money,regions:z.array(text).min(1),maxUnits:int,evidenceId:id}),
 z.strictObject({kind:z.literal('unknown'),note:text}),z.strictObject({kind:z.literal('quote'),note:text})
]);
export const seller=z.strictObject({id,name:text,channel:z.enum(['direct','marketplace']),shopUrl:httpsUrl,purchaseHosts:z.array(host).min(1)});
export const product=z.strictObject({id,slug:id,name:text,category:z.enum(['board','top']),species:z.enum(['杉','桧','パイン','その他']).nullable(),finish:z.enum(['無塗装','研磨','塗装','エイジング']).nullable(),uses:z.array(z.enum(['wall','shelf','desk','counter'])),description:text,status:z.enum(['draft','published']),identityEvidenceId:id,imageId:id.nullable()});
export const variant=z.strictObject({id,productId:id,sellerSku:text.nullable(),length:dimension,width:dimension,thickness:dimension,coverageWidth:dimension,geometry:z.enum(['uniform','mixed','irregular']),evidenceId:id});
export const offer=z.strictObject({id,variantId:id,sellerId:id,sourceUrl:httpsUrl,purchaseUrl:httpsUrl,saleUnit:z.enum(['piece','set']),piecesPerUnit:int.nullable(),price,shipping,availability:z.enum(['available','made-to-order','quote','unknown','sold-out','discontinued','display-only']),minimumUnits:int,unitStep:int,maxUnits:int.nullable(),checkedAt:date,evidenceIds:z.array(id)});
export const adLink=z.strictObject({offerId:id,state:z.enum(['none','pending','approved','suspended']),url:httpsUrl.nullable(),allowedHosts:z.array(host),checkedAt:date.nullable(),expiresAt:date.nullable()});
export const evidence=z.strictObject({id,url:httpsUrl,checkedAt:date,method:z.enum(['direct','search-index','kcp-record']),fields:z.array(text).min(1),note:z.string()});
export const imageRight=z.strictObject({id,localPath:z.string().regex(/^\/images\/[a-zA-Z0-9/_-]+\.(?:png|jpg|jpeg|webp|avif)$/).nullable(),sourceUrl:httpsUrl,state:z.enum(['unknown','permitted','owned','expired']),basis:z.string(),checkedAt:date.nullable(),expiresAt:date.nullable(),attribution:z.string().nullable()});
export const catalogSchema=z.strictObject({schemaVersion:z.literal(1),sellers:z.array(seller),products:z.array(product),variants:z.array(variant),offers:z.array(offer),adLinks:z.array(adLink),evidence:z.array(evidence),images:z.array(imageRight)});
export function parseCatalog(input:unknown,today:string):z.infer<typeof catalogSchema> {
 date.parse(today);
 const c=catalogSchema.parse(input);
 const fail=(path:string,message:string):never=>{throw new Error(path+': '+message);};
 for(const key of ['sellers','products','variants','offers','evidence','images'] as const){
  const seen=new Set<string>();for(const [i,x] of c[key].entries()){if(seen.has(x.id))fail(`${key}[${i}].id`,'duplicate');seen.add(x.id);}
 }
 const slugs=new Set<string>();for(const p of c.products){if(slugs.has(p.slug))fail('products.slug','duplicate');slugs.add(p.slug);}
 const ev=(eid:string,path:string,field?:string)=>{const e=c.evidence.find(e=>e.id===eid);if(!e) return fail(path,'missing reference');if(field&&!e.fields.includes(field))fail(path,'missing '+field+' evidence');return e;};
 for(const [i,e] of c.evidence.entries())if(e.checkedAt>today)fail(`evidence[${i}].checkedAt`,'future date');
 for(const [i,p] of c.products.entries()){
  ev(p.identityEvidenceId,`products[${i}].identityEvidenceId`,'identity');
  if(p.uses.length)ev(p.identityEvidenceId,`products[${i}].uses`,'uses');
  if(p.imageId&&!c.images.some(x=>x.id===p.imageId))fail(`products[${i}].imageId`,'missing reference');
 }
 for(const [i,v] of c.variants.entries()){
  if(!c.products.some(p=>p.id===v.productId))fail(`variants[${i}].productId`,'missing reference');
  ev(v.evidenceId,`variants[${i}].evidenceId`,[v.length,v.width,v.thickness,v.coverageWidth].some(d=>d.kind!=='unknown')?'dimensions':undefined);
 }
 for(const [i,o] of c.offers.entries()){
  const path=`offers[${i}]`;
  if(!c.variants.some(v=>v.id===o.variantId))fail(path+'.variantId','missing reference');
  const s=c.sellers.find(s=>s.id===o.sellerId);if(!s)fail(path+'.sellerId','missing reference');
  if(!s!.purchaseHosts.includes(new URL(o.purchaseUrl).hostname))fail(path+'.purchaseUrl','host not allowed');
  if(o.checkedAt>today)fail(path+'.checkedAt','future date');
  if(o.saleUnit==='piece'&&o.piecesPerUnit!==1)fail(path+'.piecesPerUnit','piece must be 1');
  if(o.maxUnits!==null&&o.maxUnits<o.minimumUnits)fail(path+'.maxUnits','below minimumUnits');
  const fields=new Set<string>();
  for(const eid of o.evidenceIds){for(const f of ev(eid,path+'.evidenceIds').fields){if(fields.has(f))fail(path+'.evidenceIds','duplicate '+f);fields.add(f);}}
  if(['fixed','from'].includes(o.price.kind)&&!fields.has('price'))fail(path+'.price','missing price evidence');
  if(o.availability!=='unknown'&&!fields.has('availability'))fail(path+'.availability','missing availability evidence');
  if(o.shipping.kind==='fixed'||o.shipping.kind==='free')ev(o.shipping.evidenceId,path+'.shipping','shipping');
 }
 const ads=new Set<string>();for(const [i,a] of c.adLinks.entries()){
  if(ads.has(a.offerId))fail(`adLinks[${i}].offerId`,'duplicate');ads.add(a.offerId);
  if(!c.offers.some(o=>o.id===a.offerId))fail(`adLinks[${i}].offerId`,'missing reference');
  if(a.checkedAt&&a.checkedAt>today)fail(`adLinks[${i}].checkedAt`,'future date');
 }
 for(const [i,x] of c.images.entries()){
  if(x.checkedAt&&x.checkedAt>today)fail(`images[${i}].checkedAt`,'future date');
  if(['permitted','owned'].includes(x.state)&&(!x.basis||!x.checkedAt||!x.localPath))fail(`images[${i}]`,'permission basis required');
 }
 for(const [i,p] of c.products.entries()){
  if(p.status==='published'&&!c.offers.some(o=>c.variants.some(v=>v.id===o.variantId&&v.productId===p.id)))fail(`products[${i}].offers`,'published product needs offer');
 }
 return c;
}
