import type {CatalogRow,Dimension} from '../catalog/types';
export type WallInput={ww:number;wh:number;direction:'vertical'|'horizontal';joint:'none'|'butt';trim:number;kerf:number;reserve:number;extra:number};
export type Bound={rows:number;perRow:number;installed:number;spare:number;required:number;units:number;purchased:number;excess:number};
export type EstimateResult={kind:'estimate'|'reference';low:Bound;high:Bound;reasons:string[]}|{kind:'unavailable';reasons:string[]};
export function estimateWall(row:CatalogRow,input:WallInput):EstimateResult {
 const unavailable=(reason:string):EstimateResult=>({kind:'unavailable',reasons:[reason]});
 for(const [key,min,max] of [['ww',100,10000],['wh',100,10000],['trim',0,20],['kerf',0,10],['reserve',0,30],['extra',0,100]] as const){const v=input[key];if(!Number.isSafeInteger(v)||v<min||v>max)return unavailable(key+'の入力範囲を確認してください');}
 if(!['vertical','horizontal'].includes(input.direction)||!['none','butt'].includes(input.joint))return unavailable('張る方向・継ぎを確認してください');
 const {product,variant,offer}=row;
 if(product.category!=='board'||variant.geometry!=='uniform')return unavailable('均一な壁用板材のみ計算できます');
 const bounds=(d:Dimension):[number,number]|null=>d.kind==='bounded'?[d.minMm,d.maxMm]:d.kind==='nominal'?[d.mm,d.mm]:null;
 const length=bounds(variant.length),width=bounds(variant.coverageWidth);
 if(!length||!width)return unavailable('納品寸法・有効幅の確認が必要です。注文可能範囲は計算できません');
 const pieces=offer.piecesPerUnit;
 if(!pieces)return unavailable('販売単位の枚数が未確認です');
 const s=input.direction==='vertical'?input.wh:input.ww,c=input.direction==='vertical'?input.ww:input.wh;
 const evaluate=(l:number,b:number):Bound|null=>{
  const e=l-2*input.trim-input.kerf;
  if(e<=0||b<=0||(input.joint==='none'&&s>e))return null;
  const rows=Math.ceil(c/b),perRow=input.joint==='none'?1:Math.ceil(s/e),installed=rows*perRow;
  const spare=Math.ceil(installed*input.reserve/100)+input.extra,required=installed+spare;
  const u0=Math.ceil(required/pieces),units=offer.minimumUnits+Math.ceil(Math.max(0,u0-offer.minimumUnits)/offer.unitStep)*offer.unitStep;
  const purchased=units*pieces;
  if(!Number.isSafeInteger(purchased)||purchased>100000||units>10000||(offer.maxUnits!==null&&units>offer.maxUnits))return null;
  return {rows,perRow,installed,spare,required,units,purchased,excess:purchased-required};
 };
 const low=evaluate(length[1],width[1]),high=evaluate(length[0],width[0]);
 if(!low||!high)return unavailable('長さ不足、加工余裕、または購入数量の上限を確認してください');
 const reasons:string[]=[];
 if(variant.length.kind==='nominal'||variant.coverageWidth.kind==='nominal')reasons.push('公称寸法による参考計算');
 if(!['available','made-to-order'].includes(offer.availability))reasons.push('販売状態の確認が必要な参考計算');
 return {kind:reasons.length?'reference':'estimate',low,high,reasons};
}
