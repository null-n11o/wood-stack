import type { Dimension, Offer } from './types';
export const yen = (n: number) => n.toLocaleString('ja-JP') + '円';
export function dimensionText(d: Dimension): string {
  switch (d.kind) {
    case 'bounded':
      return d.minMm === d.maxMm
        ? `${d.minMm}mm`
        : `${d.minMm}〜${d.maxMm}mm（納品範囲）`;
    case 'nominal':
      return `${d.mm}mm（公称・${d.note}）`;
    case 'selectable':
      return `${d.minMm}〜${d.maxMm}mm（注文可能範囲・${d.stepMm}mm刻み）`;
    default:
      return '未確認';
  }
}
export function priceText(o: Offer): string {
  const p = o.price,
    unit =
      o.saleUnit === 'piece'
        ? '1枚'
        : `1セット（${o.piecesPerUnit ?? '入数未確認'}${o.piecesPerUnit ? '枚' : ''}）`;
  return p.kind === 'fixed' || p.kind === 'from'
    ? `${yen(p.yen)}${p.kind === 'from' ? 'から' : ''} / ${unit}（${{ included: '税込', excluded: '税抜', unknown: '税区分未確認' }[p.tax]}）`
    : p.kind === 'quote'
      ? '価格は見積もり'
      : '価格未確認';
}
export const availabilityText: Record<Offer['availability'], string> = {
  available: '販売中',
  'made-to-order': '受注生産',
  quote: '要見積もり',
  unknown: '在庫未確認',
  'sold-out': '売切れ',
  discontinued: '販売終了',
  'display-only': '展示作品',
};
