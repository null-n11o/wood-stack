import {
  connect,
  byId,
  el,
  link,
  button,
  fillForm,
  renderErrors,
} from './shared';
import { defaultState, parseState, encodeState } from '../search/state';
import { searchCatalog, unitPrice } from '../search/catalog';
import { catalogRows } from '../search/compare';
import {
  dimensionText,
  priceText,
  yen,
  availabilityText,
} from '../catalog/format';
import { canShowImage } from '../offers/links';
import { jstToday } from '../offers/freshness';
export function startCatalog() {
  let bound = false;
  void connect((session) => {
    const { catalog, state } = session,
      form = byId<HTMLFormElement>('search-form'),
      page = searchCatalog(catalog, state.filters, jstToday());
    state.filters.page = page.page;
    fillForm(form, state.filters);
    byId('static-catalog').hidden = true;
    const results = byId('search-results');
    results.hidden = false;
    results.replaceChildren();
    byId('result-count').textContent =
      page.total + '件 / ' + page.page + 'ページ';
    const rows = catalogRows(catalog);
    for (const p of page.products) {
      const card = el('article');
      card.className = 'card';
      card.dataset.productId = p.productId;
      const r = rows.find((r) => r.offer.id === p.representativeOfferId)!;
      const h = el('h2');
      h.append(link(r.product.name, '/products/' + r.product.slug + '/'));
      const image = catalog.images.find((i) => i.id === r.product.imageId);
      if (image && canShowImage(image, jstToday())) {
        const figure = el('figure'),
          img = el('img');
        img.src = image.localPath!;
        img.alt = r.product.name;
        figure.append(img);
        if (image.attribution)
          figure.append(el('figcaption', image.attribution));
        card.append(figure);
      } else card.append(el('p', '画像未掲載'));
      card.append(h, el('p', p.purchaseSourceCount + '購入先'));
      const label = el('label', '寸法・販売条件（' + r.product.name + '）'),
        select = el('select');
      for (const id of p.matchingOfferIds) {
        const row = rows.find((r) => r.offer.id === id)!;
        const option = el(
          'option',
          row.seller.name +
            ' / ' +
            dimensionText(row.variant.length) +
            ' × ' +
            dimensionText(row.variant.width),
        );
        option.value = id;
        select.append(option);
      }
      label.append(select);
      const info = el('div'),
        add = button(r.product.name + 'を比較に追加', () =>
          session.add(select.value),
        );
      const show = () => {
        const row = rows.find((r) => r.offer.id === select.value)!,
          unit = unitPrice(row, catalog, jstToday());
        info.replaceChildren(
          el('p', priceText(row.offer)),
          el(
            'p',
            '送料' +
              (row.offer.shipping.kind === 'unknown'
                ? '未確認'
                : row.offer.shipping.kind === 'quote'
                  ? 'は見積もり'
                  : 'は適用条件を確認'),
          ),
          el('p', availabilityText[row.offer.availability]),
          el('p', '販売状態確認 ' + row.offer.checkedAt),
          el(
            'p',
            unit === null
              ? '比較単価不明'
              : `参考単価 ${yen(Math.round(unit))}/${row.product.category === 'board' ? '㎡' : '枚'}`,
          ),
        );
      };
      select.onchange = show;
      show();
      card.append(
        label,
        info,
        el('p', '代表の販売条件は並び順で変わります。'),
        add,
      );
      results.append(card);
    }
    if (!page.total)
      results.append(
        el('p', '条件に合う商品がありません。条件を解除してお探しください。'),
      );
    const active = byId('active-filters');
    active.replaceChildren();
    for (const [k, v] of Object.entries(state.filters)) {
      if (v !== null && v !== '' && !['category', 'sort', 'page'].includes(k))
        active.append(
          button(
            (
              {
                q: '検索語',
                species: '材種',
                finish: '仕上げ',
                use: '用途',
                lmin: '長さ下限',
                lmax: '長さ上限',
                wmin: '幅下限',
                wmax: '幅上限',
                tmin: '厚さ下限',
                tmax: '厚さ上限',
                budget: '予算',
              } as Record<string, string>
            )[k] + 'を解除',
            () => {
              const next = structuredClone(state);
              (next.filters as unknown as Record<string, unknown>)[k] = (
                defaultState().filters as unknown as Record<string, unknown>
              )[k];
              next.filters.page = 1;
              session.update(next, true);
            },
          ),
        );
    }
    const pagination = byId('pagination');
    pagination.replaceChildren();
    for (const [title, n] of [
      ['前のページ', page.page - 1],
      ['次のページ', page.page + 1],
    ] as const)
      if (n >= 1 && n <= Math.ceil(page.total / 24))
        pagination.append(
          button(title, () => {
            state.filters.page = n;
            session.update(state, true);
          }),
        );
    if (!bound) {
      bound = true;
      form.onsubmit = (e) => {
        e.preventDefault();
        const q = new URLSearchParams(encodeState(session.state));
        for (const [k, v] of new FormData(form)) q.set(k, String(v));
        q.set('page', '1');
        if (q.get('category') !== session.state.filters.category)
          for (const key of [
            'lmin',
            'lmax',
            'wmin',
            'wmax',
            'tmin',
            'tmax',
            'use',
            'budget',
          ])
            q.delete(key);
        const parsed = parseState(q.toString(), catalog);
        if (parsed.warnings.length) {
          renderErrors(parsed.warnings);
          return;
        }
        renderErrors([]);
        session.update(parsed.state, true);
      };
      byId('reset-search').onclick = () => {
        session.update(
          { ...session.state, filters: defaultState().filters },
          true,
        );
        renderErrors([]);
      };
    }
  });
}
export function startDetail() {
  let bound = false;
  void connect((session) => {
    const select = byId<HTMLSelectElement>('detail-offer'),
      add = byId<HTMLButtonElement>('detail-add'),
      wall = byId<HTMLAnchorElement>('detail-wall');
    select.disabled = false;
    const refresh = () => {
      add.disabled = !select.value;
      wall.hidden = !select.value;
      wall.href =
        '/calculator/wall/?' +
        encodeState({
          ...session.state,
          compare: select.value ? [select.value] : [],
        });
    };
    refresh();
    if (!bound) {
      bound = true;
      select.onchange = refresh;
      add.onclick = () => session.add(select.value);
    }
  });
}
