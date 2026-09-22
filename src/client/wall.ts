import type {CatalogRow} from '../catalog/types';
import {estimateWall} from '../calculator/wall';
import {calculateCost} from '../offers/cost';
import {rankWallCosts} from '../search/catalog';
import {parseState,encodeState} from '../search/state';
import {catalogRows} from '../search/compare';
import {jstToday} from '../offers/freshness';
import {yen} from '../catalog/format';
import {connect,byId,el,fillForm,renderErrors,type Session} from './shared';
export function estimateElement(row:CatalogRow,session:Session):HTMLElement{
 const box=el('section');box.className='result';box.append(el('h2',row.product.name));const input=session.state.wall;if(!input){box.append(el('p','壁の条件を入力してください'));return box;}
 const result=estimateWall(row,input),cost=calculateCost(row,result,session.catalog.evidence,jstToday());
 box.append(el('p',`${input.ww} × ${input.wh}mm / ${input.direction==='vertical'?'縦':'横'}張り / ${input.joint==='none'?'継ぎなし':'突付け概算'} / 各端${input.trim}mm・切断${input.kerf}mm・予備${input.reserve}%・追加${input.extra}枚`));
 if(result.kind==='unavailable'){box.append(el('p',result.reasons.join(' / ')));return box;}
 if(!cost.rankable)box.append(el('strong','参考計算・購入目安の順位対象外'));
 const range=(a:number,b:number)=>a===b?String(b):a+'〜'+b;
 box.append(el('p',`必要枚数 ${range(result.low.required,result.high.required)}枚 / 購入 ${range(result.low.units,result.high.units)}${row.offer.saleUnit==='piece'?'枚':'セット'}`),el('p',`最多側: ${result.high.rows}列 × ${result.high.perRow}枚 = 施工${result.high.installed}枚 + 予備${result.high.spare}枚`),el('p',`購入${result.high.purchased}枚 / セット都合の余り${result.high.excess}枚 / 予備を含む未使用見込み${result.high.purchased-result.high.installed}枚`));
 if(cost.materialHighYen!==null){const amount=cost.materialLowYen===cost.materialHighYen?yen(cost.materialHighYen):yen(cost.materialLowYen!)+'〜'+yen(cost.materialHighYen);const p=el('p','材料費 '+amount);p.className='cost';box.append(p);if(session.state.materialBudget!==null)box.append(el('p',!cost.rankable?'予算判定対象外':cost.materialHighYen<=session.state.materialBudget?'材料費予算内':cost.materialLowYen!<=session.state.materialBudget?'予算を超える可能性':'材料費予算超過'));}
 if(cost.shippingYen===null)box.append(el('p','送料未確認'));else box.append(el('p','送料 '+yen(cost.shippingYen)));
 if(cost.subtotalHighYen!==null)box.append(el('p','送料等を含む確認済み小計 '+yen(cost.subtotalHighYen)));
 for(const reason of cost.reasons.filter(r=>r!=='送料未確認'))box.append(el('p',reason));
 box.append(el('p','寸法のばらつきの両端で計算し、最多側を購入目安に使います。'));return box;
}
export function startWall(){let bound=false;void connect(session=>{const form=byId<HTMLFormElement>('wall-form');fillForm(form,session.state.wall??{ww:'',wh:'',direction:'vertical',joint:'none',trim:5,kerf:3,reserve:10,extra:0});fillForm(form,{mbudget:session.state.materialBudget});const target=byId('estimate-results');target.replaceChildren();const rows=catalogRows(session.catalog).filter(r=>session.state.compare.includes(r.offer.id));if(!rows.length)target.append(el('p','比較する商品を追加してください'));
 if(session.state.wall){target.append(el('h2','材料費が安い順（送料は含みません）'));const ranked=rankWallCosts(rows.map(r=>({offerId:r.offer.id,cost:calculateCost(r,estimateWall(r,session.state.wall!),session.catalog.evidence,jstToday())})));for(const id of ranked)target.append(estimateElement(rows.find(r=>r.offer.id===id)!,session));const remaining=rows.filter(r=>!ranked.includes(r.offer.id));if(remaining.length)target.append(el('h2','要確認・参考計算'));for(const row of remaining)target.append(estimateElement(row,session));}
 if(!bound){bound=true;form.oninput=()=>byId('estimate-results').replaceChildren();form.onsubmit=e=>{e.preventDefault();byId('estimate-results').replaceChildren();const query=new URLSearchParams(encodeState(session.state));for(const [k,v]of new FormData(form))query.set(k,String(v));const p=parseState(query.toString(),session.catalog);if(p.warnings.length||!p.state.wall){renderErrors(p.warnings.length?p.warnings:['壁の寸法を入力してください']);return;}renderErrors([]);session.update(p.state,true);};}
 });}
