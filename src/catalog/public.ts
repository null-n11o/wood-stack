import type { Catalog } from './types';
import { canShowImage } from '../offers/links';
export function toPublicCatalog(catalog: Catalog, today: string): Catalog {
  const c = structuredClone(catalog);
  c.products = c.products.filter((p) => p.status === 'published');
  c.variants = c.variants.filter((v) =>
    c.products.some((p) => p.id === v.productId),
  );
  c.offers = c.offers.filter((o) =>
    c.variants.some((v) => v.id === o.variantId),
  );
  c.sellers = c.sellers.filter((s) =>
    c.offers.some((o) => o.sellerId === s.id),
  );
  c.adLinks = c.adLinks.filter((a) => c.offers.some((o) => o.id === a.offerId));
  c.images = c.images
    .filter(
      (i) =>
        c.products.some((p) => p.imageId === i.id) && canShowImage(i, today),
    )
    .map((i) => ({ ...i, basis: '利用許諾確認済み' }));
  c.products = c.products.map((p) => ({
    ...p,
    imageId: c.images.some((i) => i.id === p.imageId) ? p.imageId : null,
  }));
  const ids = new Set([
    ...c.products.map((p) => p.identityEvidenceId),
    ...c.variants.map((v) => v.evidenceId),
    ...c.offers.flatMap((o) => [
      ...o.evidenceIds,
      ...('evidenceId' in o.shipping ? [o.shipping.evidenceId] : []),
    ]),
  ]);
  c.evidence = c.evidence
    .filter((e) => ids.has(e.id))
    .map((e) => ({ ...e, note: '' }));
  if (c.offers.length > 500) throw new Error('公開販売条件は500件まで');
  if (new TextEncoder().encode(JSON.stringify(c)).length > 1024 * 1024)
    throw new Error('公開JSONは1MiBまで');
  return c;
}
