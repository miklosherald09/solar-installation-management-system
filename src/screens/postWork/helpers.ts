/** Shared formatting helpers for the PostWork screen. */

/** Format a raw numeric string with thousands separators (e.g. "1500" → "1,500"). */
export function formatMoney(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) {
    return '';
  }
  return Number(digits).toLocaleString();
}

/** Format a `YYYY-MM-DD` string for display (e.g. "Jul 25, 2026"). */
export function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Convert a Date into the persisted `YYYY-MM-DD` string. */
export function dateToYmd(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}
