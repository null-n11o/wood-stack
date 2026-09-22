import type { Catalog, CatalogRow } from '../catalog/types';
export function catalogRows(c: Catalog): CatalogRow[] {
  return c.offers.flatMap((offer) => {
    const variant = c.variants.find((v) => v.id === offer.variantId),
      product = c.products.find(
        (p) => p.id === variant?.productId && p.status === 'published',
      ),
      seller = c.sellers.find((s) => s.id === offer.sellerId);
    return variant && product && seller
      ? [{ offer, variant, product, seller }]
      : [];
  });
}
export function toggleCompare(
  ids: string[],
  offerId: string,
  catalog: Catalog,
): { ids: string[]; reason: string | null } {
  const rows = catalogRows(catalog),
    r = rows.find((r) => r.offer.id === offerId);
  if (!r) return { ids, reason: '比較対象が見つかりません' };
  if (ids.includes(offerId)) return { ids, reason: null };
  if (ids.length >= 3)
    return { ids, reason: '比較は3件まで。1件外して追加してください' };
  if (
    ids.some(
      (id) =>
        rows.find((r) => r.offer.id === id)?.product.category !==
        r.product.category,
    )
  )
    return { ids, reason: '板材と天板は分けて比較してください' };
  return { ids: [...ids, offerId], reason: null };
}
