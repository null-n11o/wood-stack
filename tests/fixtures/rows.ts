import {fixtureRow} from './catalog';
export function rows(n=25){return Array.from({length:n},(_,i)=>fixtureRow({product:{id:'board-'+i,slug:'board-'+i,name:'同名板'},variant:{id:'variant-'+i,productId:'board-'+i},offer:{id:'offer-'+i,variantId:'variant-'+i}}));}
