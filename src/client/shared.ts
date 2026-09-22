import type { Catalog } from '../catalog/types';
import { parseState, encodeState, type UrlState } from '../search/state';
import { catalogRows, toggleCompare } from '../search/compare';
export const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
) => {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  return e;
};
export const byId = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
export function link(text: string, href: string, rel?: string) {
  const a = el('a', text);
  a.href = href;
  if (rel) a.rel = rel;
  return a;
}
export function button(text: string, click: () => void) {
  const b = el('button', text);
  b.type = 'button';
  b.addEventListener('click', click);
  return b;
}
export function fillForm(
  form: HTMLFormElement,
  values: Record<string, unknown>,
) {
  for (const [k, v] of Object.entries(values)) {
    const field = form.elements.namedItem(k);
    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement)
      field.value = v === null ? '' : String(v);
  }
}
export function renderErrors(errors: string[]) {
  const box = byId('errors');
  box.replaceChildren();
  for (const message of errors) {
    const p = el('p');
    const key = message.split('の')[0],
      target = document.getElementById(key);
    p.append(
      target ? link(message, '#' + key) : document.createTextNode(message),
    );
    box.append(p);
  }
}
export type Session = {
  catalog: Catalog;
  state: UrlState;
  render: () => void;
  update: (state: UrlState, push?: boolean) => void;
  add: (id: string) => void;
};
export async function connect(
  render: (session: Session) => void,
): Promise<void> {
  const load = async () => {
    try {
      byId('retry').hidden = true;
      const response = await fetch('/catalog.json');
      if (!response.ok) throw Error('catalog');
      const catalog: Catalog = await response.json();
      if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.products))
        throw Error('schema');
      const parsed = parseState(location.search, catalog);
      const session: Session = {
        catalog,
        state: parsed.state,
        render: () => {},
        update: (state, push = false) => {
          session.state = state;
          history[push ? 'pushState' : 'replaceState'](
            null,
            '',
            '?' + encodeState(state),
          );
          session.render();
        },
        add: (id) => {
          const result = toggleCompare(session.state.compare, id, catalog);
          session.state.compare = result.ids;
          session.update(session.state);
          byId('compare-status').textContent =
            result.reason ?? '比較に追加しました';
        },
      };
      session.render = () => {
        render(session);
        const query = encodeState(session.state);
        for (const a of document.querySelectorAll<HTMLAnchorElement>(
          'a[href]',
        )) {
          const u = new URL(a.href, location.href);
          if (
            !u.hash &&
            a.id !== 'detail-wall' &&
            u.origin === location.origin &&
            (u.pathname.startsWith('/products/') ||
              ['/compare/', '/calculator/wall/'].includes(u.pathname))
          ) {
            u.search = query;
            a.href = u.pathname + u.search;
          }
        }
        const tray = byId('compare-items');
        if (tray) {
          tray.replaceChildren();
          for (const id of session.state.compare) {
            const r = catalogRows(catalog).find((r) => r.offer.id === id);
            if (r)
              tray.append(
                button(r.product.name + 'を外す', () => {
                  session.state.compare = session.state.compare.filter(
                    (x) => x !== id,
                  );
                  session.update(session.state);
                }),
              );
          }
        }
      };
      for (const fieldset of document.querySelectorAll<HTMLFieldSetElement>(
        'fieldset',
      ))
        fieldset.disabled = false;
      byId('load-status').textContent = '';
      session.update(session.state);
      renderErrors(parsed.warnings);
      window.addEventListener('popstate', () => {
        const p = parseState(location.search, catalog);
        session.state = p.state;
        session.render();
        renderErrors(p.warnings);
      });
    } catch (error) {
      byId('load-status').textContent =
        'データを読み込めませんでした。静的な商品情報は引き続き確認できます。';
      byId('retry').hidden = false;
    }
  };
  byId('retry').onclick = () => void load();
  await load();
}
