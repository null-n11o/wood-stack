import type {Catalog, CatalogRow, Product, Variant, Offer} from '../../src/catalog/types';
export const today = '2026-09-22';
export const wallInput = {ww:1800,wh:900,direction:'vertical' as const,joint:'butt' as const,trim:5,kerf:3,reserve:10,extra:0};
export function fixtureRow(patch: {product?:Partial<Product>;variant?:Partial<Variant>;offer?:Partial<Offer>} = {}): CatalogRow {
 return {
 product:{id:'board-a',slug:'board-a',name:'A板',category:'board',species:'杉',finish:'無塗装',uses:['wall'],description:'試験用板材',status:'published',identityEvidenceId:'ev-a',imageId:null,...patch.product},
 variant:{id:'variant-a',productId:'board-a',sellerSku:null,length:{kind:'bounded',minMm:1000,maxMm:1000},width:{kind:'bounded',minMm:100,maxMm:100},coverageWidth:{kind:'bounded',minMm:100,maxMm:100},thickness:{kind:'bounded',minMm:10,maxMm:10},geometry:'uniform',evidenceId:'ev-a',...patch.variant},
 offer:{id:'offer-a',variantId:'variant-a',sellerId:'seller-a',sourceUrl:'https://example.com/board',purchaseUrl:'https://example.com/board',saleUnit:'set',piecesPerUnit:10,price:{kind:'fixed',yen:2000,tax:'included'},shipping:{kind:'unknown',note:'送料未確認'},availability:'available',minimumUnits:1,unitStep:1,maxUnits:null,checkedAt:today,evidenceIds:['ev-a'],...patch.offer},
 seller:{id:'seller-a',name:'試験店',channel:'direct',shopUrl:'https://example.com/',purchaseHosts:['example.com']}
 };
}
export function fixtureCatalog(rows: CatalogRow[] = [fixtureRow()]): Catalog {
 const unique = <T extends {id:string}>(xs:T[]) => [...new Map(xs.map(x=>[x.id,x])).values()];
 return {schemaVersion:1,sellers:unique(rows.map(r=>r.seller)),products:unique(rows.map(r=>r.product)),variants:unique(rows.map(r=>r.variant)),offers:unique(rows.map(r=>r.offer)),adLinks:[],images:[],evidence:[{id:'ev-a',url:'https://example.com/board',checkedAt:today,method:'direct',fields:['identity','dimensions','price','availability','uses','shipping','purchase-unit'],note:'合成fixture'}]};
}
export function e2eCatalog():Catalog{
 const rows=[fixtureRow(),...['b','c','d'].map((s,i)=>fixtureRow({product:{id:'board-'+s,slug:'board-'+s,name:['B板','C板','D板'][i]},variant:{id:'variant-'+s,productId:'board-'+s},offer:{id:'offer-'+s,variantId:'variant-'+s}})),fixtureRow({product:{id:'top-a',slug:'top-a',name:'天板A',category:'top'},variant:{id:'top-v',productId:'top-a'},offer:{id:'top-o',variantId:'top-v'}})];
 return fixtureCatalog(rows);
}
