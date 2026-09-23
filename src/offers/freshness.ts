export function validDate(s: string): boolean {
  const d = new Date(s + 'T00:00:00Z');
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !isNaN(+d) &&
    d.toISOString().slice(0, 10) === s
  );
}
export function freshness(
  checkedAt: string,
  today: string,
  limitDays: number,
): 'fresh' | 'stale' {
  if (!validDate(checkedAt) || !validDate(today)) return 'stale';
  const days = (Date.parse(today) - Date.parse(checkedAt)) / 86400000;
  return days >= 0 && days <= limitDays ? 'fresh' : 'stale';
}
export const jstToday = () =>
  new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
