import type {Catalog,CatalogRow,Dimension} from '../catalog/types';
import type {Filters} from './state';
import type {CostResult} from '../offers/cost';
import {freshness} from '../offers/freshness';
import {catalogRows} from './compare';
export type SearchPage={products:{productId:string;representativeOfferId:string;matchingOfferIds:string[];purchaseSourceCount:number}[];total:number;page:number};
export const normalize=(s:string)=>s.normalize('NFKC').toLowerCase().trim();
export const lexical=(a:string,b:string)=>a<b?-1:a>b?1:0;
export function priceEligible(row:CatalogRow,c:Pick<Catalog,'evidence'>,today:string):boolean{
 const p=c.evidence.find(e=>row.offer.evidenceIds.includes(e.id)&&e.fields.includes('price')),v=c.evidence.find(e=>e.id===row.variant.evidenceId);
 return row.offer.price.kind==='fixed'&&row.offer.price.tax==='included'&&!!p&&p.method==='direct'&&freshness(p.checkedAt,today,30)==='fresh'&&!!v&&v.method==='direct'&&freshness(v.checkedAt,today,90)==='fresh'&&freshness(row.offer.checkedAt,today,30)==='fresh'&&['available','made-to-order'].includes(row.offer.availability);
}
export function unitPrice(row:CatalogRow,c:Pick<Catalog,'evidence'>,today:string):number|null{
 if(!priceEligible(row,c,today)||row.offer.price.kind!=='fixed'||!row.offer.piecesPerUnit)return null;
 const {length,coverageWidth}=row.variant;
 if(row.product.category==='top')return row.offer.price.yen/row.offer.piecesPerUnit;
 return length.kind==='bounded'&&coverageWidth.kind==='bounded'?row.offer.price.yen/(length.minMm*coverageWidth.minMm*row.offer.piecesPerUnit/1000000):null;
}
export function searchCatalog(catalog:Catalog,filters:Filters,today:string):SearchPage {
 // Only joined product/variant/offer/seller rows and evidence enter ranking.
 const rows=catalogRows(catalog),tokens=normalize(filters.q).split(/\s+/).filter(Boolean);
 const fits=(d:Dimension,min:number|null,max:number|null)=>min===null&&max===null||d.kind==='bounded'&&(min===null||d.minMm>=min)&&(max===null||d.maxMm<=max);
 const filtered=rows.filter(r=>r.product.category===filters.category&&!['sold-out','discontinued','display-only'].includes(r.offer.availability)&&tokens.every(t=>normalize([r.product.name,r.product.species,r.product.finish,r.seller.name].join(' ')).includes(t))&&(!filters.species||r.product.species===filters.species)&&(!filters.finish||r.product.finish===filters.finish)&&(!filters.use||r.product.uses.includes(filters.use as 'wall'))&&fits(r.variant.length,filters.lmin,filters.lmax)&&fits(r.variant.width,filters.wmin,filters.wmax)&&fits(r.variant.thickness,filters.tmin,filters.tmax)&&(filters.budget===null||priceEligible(r,catalog,today)&&r.offer.price.kind==='fixed'&&r.offer.price.yen<=filters.budget));
 const checked=(r:CatalogRow)=>{const p=catalog.evidence.find(e=>r.offer.evidenceIds.includes(e.id)&&e.fields.includes('price')),s=catalog.evidence.find(e=>e.id===r.variant.evidenceId);return p&&s?[p.checkedAt,s.checkedAt].sort()[0]:null;};
 const metric=(r:CatalogRow):number|null=>filters.sort==='unit-price'?unitPrice(r,catalog,today):filters.sort==='checked'?(checked(r)?-Date.parse(checked(r)!):null):0;
 filtered.sort((a,b)=>{const x=metric(a),y=metric(b);return (x===null?(y===null?0:1):y===null?-1:x-y)||lexical(normalize(a.product.name),normalize(b.product.name))||lexical(a.product.id,b.product.id)||lexical(a.variant.id,b.variant.id)||lexical(a.offer.id,b.offer.id);});
 const groups=new Map<string,CatalogRow[]>();for(const r of filtered)groups.set(r.product.id,[...(groups.get(r.product.id)??[]),r]);
 const products=[...groups].map(([productId,rs])=>({productId,representativeOfferId:rs[0].offer.id,matchingOfferIds:rs.map(r=>r.offer.id),purchaseSourceCount:new Set(rs.map(r=>r.seller.id)).size}));
 const total=products.length,page=Math.max(1,Math.min(filters.page,Math.ceil(total/24)||1));
 return {products:products.slice((page-1)*24,page*24),total,page};
}
export function rankWallCosts(rows:{offerId:string;cost:CostResult}[]):string[]{return rows.filter(r=>r.cost.rankable&&r.cost.materialHighYen!==null).sort((a,b)=>a.cost.materialHighYen!-b.cost.materialHighYen!||lexical(a.offerId,b.offerId)).map(r=>r.offerId);}
