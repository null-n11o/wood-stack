import type { Offer, Seller, AdLink, ImageRight } from '../catalog/types';
import { validDate } from './freshness';
function checked(d: string | null, today: string) {
  return d !== null && validDate(d) && d <= today;
}
function active(expires: string | null, today: string) {
  return expires === null || (validDate(expires) && expires >= today);
}
export function purchaseLink(
  offer: Offer,
  _seller: Seller,
  ad: AdLink | undefined,
  today: string,
): { href: string; label: string; rel: string } {
  let valid = false;
  if (
    ad?.state === 'approved' &&
    ad.offerId === offer.id &&
    ad.url &&
    checked(ad.checkedAt, today) &&
    active(ad.expiresAt, today)
  ) {
    try {
      const u = new URL(ad.url);
      valid =
        u.protocol === 'https:' &&
        !u.username &&
        !u.password &&
        ad.allowedHosts.includes(u.hostname);
    } catch {
      valid = false;
    }
  }
  return valid
    ? { href: ad!.url!, label: '広告・販売店で確認', rel: 'sponsored noopener' }
    : { href: offer.purchaseUrl, label: '販売店で確認', rel: 'noopener' };
}
export function canShowImage(image: ImageRight, today: string): boolean {
  return (
    ['permitted', 'owned'].includes(image.state) &&
    !!image.basis &&
    !!image.localPath &&
    checked(image.checkedAt, today) &&
    active(image.expiresAt, today)
  );
}
