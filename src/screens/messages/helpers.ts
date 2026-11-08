/** Shared helpers for the messages screen */

const AVATAR_COLORS = [
  '#0088FF',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
];

/**
 * Pick a deterministic color for a given name.
 */
export function avatarColor(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

/**
 * Build initials (max two) from a name, uppercased.
 */
export function getInitials(name?: string | null): string {
  if (!name) return '?';
  return (
    name
      .split(' ')
      .map(part => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

/**
 * 100-nanosecond intervals between the Gregorian epoch (1582-10-15) and the
 * Unix epoch (1970-01-01), used to decode timeuuid timestamps.
 */
const GREGORIAN_TO_UNIX_100NS = 122192928000000000n;

/**
 * Cassandra `timeuuid` columns serialize to JSON as UUID v1 strings, which
 * `new Date()` cannot parse directly. This decodes the embedded 60-bit
 * timestamp so conversation times can be shown as relative durations.
 */
function parseTimeuuidToDate(value: string): Date | null {
  // Accept a plain (ISO) timestamp directly when available.
  const direct = new Date(value);
  if (!isNaN(direct.getTime())) {
    return direct;
  }

  const hex = value.replace(/-/g, '');
  if (!/^[0-9a-fA-F]{32}$/.test(hex)) {
    return null;
  }

  // UUID v1 layout (after removing dashes):
  //   time_low (8) - time_mid (4) - time_hi_and_version (4) - ...
  const timeLow = BigInt(`0x${hex.slice(0, 8)}`);
  const timeMid = BigInt(`0x${hex.slice(8, 12)}`);
  const timeHiAndVersion = BigInt(`0x${hex.slice(12, 16)}`);

  // The top nibble is the version; timeuuids are always version 1.
  if (Number((timeHiAndVersion >> 12n) & 15n) !== 1) {
    return null;
  }

  const timeHi = timeHiAndVersion & 4095n;
  const timestamp100ns = (timeHi << 48n) | (timeMid << 32n) | timeLow;
  const msSinceEpoch = Number(
    (timestamp100ns - GREGORIAN_TO_UNIX_100NS) / 10000n,
  );
  return new Date(msSinceEpoch);
}

/**
 * Format a message/conversation timestamp (ISO or timeuuid) as a relative
 * duration: "Just now", "2 mins ago", "3 hours ago", "5 days ago", etc.
 */
export function formatTimeAgo(value?: string | null): string {
  if (!value) return '';

  const date = parseTimeuuidToDate(value);
  if (!date) return '';

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;

  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}
