import {expect,test} from 'vitest';
import {parseCatalog} from '../../src/catalog/schema';
import {fixtureCatalog,today} from '../fixtures/catalog';
test('未確認送料を保持する',()=>expect(parseCatalog(fixtureCatalog(),today).offers[0].shipping).toEqual({kind:'unknown',note:'送料未確認'}));
test.each([
 ['variantId',(c:any):void=>{c.offers[0].variantId='missing';}],
 ['duplicate',(c:any):void=>{c.products.push(c.products[0]);}],
 ['slug',(c:any):void=>{c.products[0].slug='../bad';}],
 ['price',(c:any):void=>{c.offers[0].price.yen=-1;}],
 ['checkedAt',(c:any):void=>{c.offers[0].checkedAt='2026-02-30';}],
 ['checkedAt',(c:any):void=>{c.offers[0].checkedAt='2026-09-23';}],
 ['purchaseUrl',(c:any):void=>{c.offers[0].purchaseUrl='https://evil.example/';}],
 ['purchaseUrl',(c:any):void=>{c.offers[0].purchaseUrl='https://user:password@example.com/';}],
 ['price',(c:any):void=>{c.offers[0].price.rewardRate=10;}],
 ['piecesPerUnit',(c:any):void=>{c.offers[0].saleUnit='piece';c.offers[0].piecesPerUnit=10;}],
 ['maxUnits',(c:any):void=>{c.offers[0].maxUnits=0;}],
 ['dimensions',(c:any):void=>{c.evidence[0].fields=['identity','price','uses'];}],
 ['price',(c:any):void=>{c.evidence.push({...c.evidence[0],id:'ev-b',fields:['price']});c.offers[0].evidenceIds.push('ev-b');}],
 ['offers',(c:any):void=>{c.offers=[];}],
 ['length',(c:any):void=>{c.variants[0].length.minMm=2000;}],
] as const)('不正な%sを拒否', (path,mutate)=>{const c=fixtureCatalog();mutate(c);expect(()=>parseCatalog(c,today)).toThrow(new RegExp(path));});
test('注文可能範囲を納品公差へ変換しない',()=>{const c=fixtureCatalog();c.variants[0].length={kind:'selectable',minMm:810,maxMm:910,stepMm:1};expect(parseCatalog(c,today).variants[0].length.kind).toBe('selectable');});
