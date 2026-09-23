import type { CatalogRow, Evidence } from '../catalog/types';
import type { EstimateResult } from '../calculator/wall';
import { freshness } from './freshness';
export type CostResult = {
  materialLowYen: number | null;
  materialHighYen: number | null;
  shippingYen: number | null;
  subtotalLowYen: number | null;
  subtotalHighYen: number | null;
  rankable: boolean;
  reasons: string[];
};
export function calculateCost(
  row: CatalogRow,
  estimate: EstimateResult,
  evidence: Evidence[],
  today: string,
): CostResult {
  const reasons = [...estimate.reasons];
  const empty = (): CostResult => ({
    materialLowYen: null,
    materialHighYen: null,
    shippingYen: null,
    subtotalLowYen: null,
    subtotalHighYen: null,
    rankable: false,
    reasons,
  });
  if (estimate.kind === 'unavailable') return empty();
  const { offer, variant } = row,
    p = offer.price;
  if (p.kind !== 'fixed' || p.tax !== 'included') {
    reasons.push('税込固定価格が未確認');
    return empty();
  }
  const materialLowYen = estimate.low.units * p.yen,
    materialHighYen = estimate.high.units * p.yen;
  if (materialHighYen > 100000000 || !Number.isSafeInteger(materialHighYen)) {
    reasons.push('材料費が計算上限を超えています');
    return empty();
  }
  let rankable = estimate.kind === 'estimate';
  const price = evidence.find(
    (e) => offer.evidenceIds.includes(e.id) && e.fields.includes('price'),
  );
  const spec = evidence.find(
    (e) => e.id === variant.evidenceId && e.fields.includes('dimensions'),
  );
  if (
    !price ||
    price.method !== 'direct' ||
    freshness(price.checkedAt, today, 30) === 'stale'
  ) {
    rankable = false;
    reasons.push('価格の直接確認・再確認が必要');
  }
  if (
    !spec ||
    spec.method !== 'direct' ||
    freshness(spec.checkedAt, today, 90) === 'stale'
  ) {
    rankable = false;
    reasons.push('仕様の再確認が必要な参考計算');
  }
  if (
    !['available', 'made-to-order'].includes(offer.availability) ||
    freshness(offer.checkedAt, today, 30) === 'stale'
  ) {
    rankable = false;
    reasons.push('販売状態の再確認が必要');
  }
  let shippingYen: number | null = null;
  const s = offer.shipping;
  if (s.kind === 'free' || s.kind === 'fixed') {
    const e = evidence.find(
      (e) => e.id === s.evidenceId && e.fields.includes('shipping'),
    );
    if (
      s.regions.length === 1 &&
      s.regions[0] === 'all' &&
      (s.maxUnits === null || estimate.high.units <= s.maxUnits) &&
      e?.method === 'direct' &&
      freshness(e.checkedAt, today, 30) === 'fresh'
    )
      shippingYen = s.kind === 'free' ? 0 : s.yen;
  }
  if (shippingYen === null) reasons.push('送料未確認');
  return {
    materialLowYen,
    materialHighYen,
    shippingYen,
    subtotalLowYen: shippingYen === null ? null : materialLowYen + shippingYen,
    subtotalHighYen:
      shippingYen === null ? null : materialHighYen + shippingYen,
    rankable,
    reasons,
  };
}
