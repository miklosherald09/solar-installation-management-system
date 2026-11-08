/**
 * Utils
 * Utility functions and helpers
 */

export { cn } from './cn';
export { formatTimeAgo } from './dateUtils';
export {
  formatBudget,
  countryToCurrencySymbol,
  getCurrencySymbolFromAddress,
  getCurrencySymbolFromCoords,
} from './currencyUtils';
export { playVideo } from './playVideo';

/**
 * Validates whether a string is a UUID (v1 through v5).
 * Returns true for valid UUIDs like "550e8400-e29b-41d4-a716-446655440000".
 */
export function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/**
 * Mask an email address so the full value can't be read at a glance.
 *
 * Keeps the first character of the local part and of the domain name, and
 * keeps the top-level domain, replacing the rest with asterisks:
 *   "mik@solarimsys.com" -> "m***@s***.com"
 */
export function maskEmail(email: string): string {
  const value = email?.trim();
  if (!value) return '';

  const at = value.indexOf('@');
  if (at <= 0) {
    // Not a valid "local@domain" — mask everything after the first char.
    return value.length > 1 ? `${value[0]}***` : '*';
  }

  const local = value.slice(0, at);
  const domain = value.slice(at + 1);

  const maskedLocal = local.length > 1 ? `${local[0]}***` : '*';

  const dot = domain.lastIndexOf('.');
  const domainName = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot + 1) : '';
  const maskedDomainName = domainName.length > 1 ? `${domainName[0]}***` : '*';

  return tld
    ? `${maskedLocal}@${maskedDomainName}.${tld}`
    : `${maskedLocal}@${maskedDomainName}`;
}
