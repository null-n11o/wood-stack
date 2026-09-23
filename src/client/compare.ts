import { connect, byId, el, link } from './shared';
import { catalogRows } from '../search/compare';
import { dimensionText, priceText, availabilityText } from '../catalog/format';
import { purchaseLink } from '../offers/links';
import { jstToday } from '../offers/freshness';
import { estimateElement } from './wall';
export function startCompare() {
  void connect((session) => {
    const container = byId('comparison');
    container.replaceChildren();
    const rows = session.state.compare
      .map((id) => catalogRows(session.catalog).find((r) => r.offer.id === id)!)
      .filter(Boolean);
    if (!rows.length) {
      container.append(el('p', '比較する商品を追加してください'));
      return;
    }
    if (rows.length === 1)
      container.append(
        el('p', '1件を表示しています。商品を追加して比較できます。'),
      );
    const table = el('table');
    table.append(el('caption', '寸法・購入条件の比較'));
    const head = el('thead'),
      hr = el('tr');
    hr.append(el('th', '項目'));
    for (const r of rows) {
      const th = el('th');
      th.scope = 'col';
      th.append(link(r.product.name, '/products/' + r.product.slug + '/'));
      hr.append(th);
    }
    head.append(hr);
    table.append(head);
    const body = el('tbody');
    for (const label of [
      '購入先',
      '長さ',
      '幅',
      '有効幅',
      '厚さ',
      '販売単位の価格',
      '送料',
      '販売状態・確認日',
      '数量・材料費',
      '購入先リンク',
    ]) {
      const tr = el('tr'),
        th = el('th', label);
      th.scope = 'row';
      tr.append(th);
      for (const r of rows) {
        const td = el('td');
        switch (label) {
          case '購入先':
            td.textContent = r.seller.name;
            break;
          case '長さ':
            td.textContent = dimensionText(r.variant.length);
            break;
          case '幅':
            td.textContent = dimensionText(r.variant.width);
            break;
          case '有効幅':
            td.textContent = dimensionText(r.variant.coverageWidth);
            break;
          case '厚さ':
            td.textContent = dimensionText(r.variant.thickness);
            break;
          case '販売単位の価格':
            td.textContent = priceText(r.offer);
            break;
          case '送料':
            td.textContent =
              r.offer.shipping.kind === 'unknown'
                ? '送料未確認'
                : '適用条件を確認';
            break;
          case '販売状態・確認日':
            td.textContent =
              availabilityText[r.offer.availability] +
              ' / ' +
              r.offer.checkedAt;
            break;
          case '数量・材料費':
            if (session.state.wall) td.append(estimateElement(r, session));
            else td.textContent = '壁の条件を入力してください';
            break;
          case '購入先リンク': {
            const l = purchaseLink(
              r.offer,
              r.seller,
              session.catalog.adLinks.find((a) => a.offerId === r.offer.id),
              jstToday(),
            );
            td.append(link(l.label, l.href, l.rel));
            break;
          }
        }
        tr.append(td);
      }
      body.append(tr);
    }
    table.append(body);
    container.append(table);
  });
}
