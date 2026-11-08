/**
 * Currency utilities for matching country to currency symbol
 */

// Mapping of country codes (ISO 3166-1 alpha-2) to currency symbols
export const countryToCurrencySymbol: Record<string, string> = {
  PH: '₱',
  US: '$',
  CA: '$',
  AU: '$',
  NZ: '$',
  GB: '£',
  IE: '€',
  FR: '€',
  DE: '€',
  IT: '€',
  ES: '€',
  NL: '€',
  BE: '€',
  AT: '€',
  FI: '€',
  GR: '€',
  PT: '€',
  JP: '¥',
  CN: '¥',
  KR: '₩',
  IN: '₹',
  SG: '$',
  MY: 'RM',
  TH: '฿',
  ID: 'Rp',
  VN: '₫',
};

/**
 * Scans an address string to detect key countries or major cities and returns the matching currency symbol.
 */
export function getCurrencySymbolFromAddress(
  address: string | null | undefined,
): string | null {
  if (!address) return null;
  const addrLower = address.toLowerCase();

  if (
    addrLower.includes('philippines') ||
    addrLower.includes(', ph') ||
    addrLower.includes('manila') ||
    addrLower.includes('quezon city') ||
    addrLower.includes('makati') ||
    addrLower.includes('mandaluyong')
  ) {
    return '₱';
  }
  if (
    addrLower.includes('united states') ||
    addrLower.includes('usa') ||
    addrLower.includes(', us') ||
    addrLower.includes('canada') ||
    addrLower.includes(', ca') ||
    addrLower.includes('australia') ||
    addrLower.includes(', au') ||
    addrLower.includes('singapore') ||
    addrLower.includes(', sg')
  ) {
    return '$';
  }
  if (
    addrLower.includes('united kingdom') ||
    addrLower.includes('great britain') ||
    addrLower.includes(', gb') ||
    addrLower.includes(', uk') ||
    addrLower.includes('london')
  ) {
    return '£';
  }
  if (
    addrLower.includes('germany') ||
    addrLower.includes('france') ||
    addrLower.includes('italy') ||
    addrLower.includes('spain') ||
    addrLower.includes(', de') ||
    addrLower.includes(', fr') ||
    addrLower.includes(', it') ||
    addrLower.includes(', es') ||
    addrLower.includes('europe') ||
    addrLower.includes(', ie') ||
    addrLower.includes('ireland')
  ) {
    return '€';
  }
  if (
    addrLower.includes('japan') ||
    addrLower.includes(', jp') ||
    addrLower.includes('tokyo')
  ) {
    return '¥';
  }
  if (
    addrLower.includes('korea') ||
    addrLower.includes(', kr') ||
    addrLower.includes('seoul')
  ) {
    return '₩';
  }
  if (addrLower.includes('india') || addrLower.includes(', in')) {
    return '₹';
  }
  if (addrLower.includes('malaysia') || addrLower.includes(', my')) {
    return 'RM';
  }
  if (addrLower.includes('thailand') || addrLower.includes(', th')) {
    return '฿';
  }
  if (addrLower.includes('indonesia') || addrLower.includes(', id')) {
    return 'Rp';
  }
  if (addrLower.includes('vietnam') || addrLower.includes(', vn')) {
    return '₫';
  }

  return null;
}

/**
 * Performs a fast bounding box lookup on coordinates to instantly resolve a currency symbol.
 */
export function getCurrencySymbolFromCoords(
  lat: number | null | undefined,
  lon: number | null | undefined,
): string | null {
  if (lat == null || lon == null) return null;

  // Philippines bounding box
  if (lat >= 4.0 && lat <= 21.5 && lon >= 115.0 && lon <= 127.0) {
    return '₱';
  }
  // USA continental bounding box
  if (lat >= 24.0 && lat <= 50.0 && lon >= -125.0 && lon <= -66.0) {
    return '$';
  }
  // UK bounding box
  if (lat >= 49.0 && lat <= 61.0 && lon >= -11.0 && lon <= 2.0) {
    return '£';
  }
  // Europe bounding box (rough)
  if (lat >= 35.0 && lat <= 70.0 && lon >= -10.0 && lon <= 40.0) {
    return '€';
  }
  // Japan bounding box
  if (lat >= 30.0 && lat <= 46.0 && lon >= 128.0 && lon <= 146.0) {
    return '¥';
  }

  return null;
}

/**
 * Format a budget amount according to budget type and currency symbol.
 */
export const formatBudget = (
  budget?: number | null,
  budgetType?: 'fixed' | 'hourly' | 'negotiable' | string,
  currencySymbol = '₱',
): string => {
  if (budgetType === 'negotiable') {
    return 'Negotiable';
  }
  if (budget == null || isNaN(Number(budget))) {
    return `${currencySymbol}0`;
  }
  const formatted = `${currencySymbol}${Number(budget).toLocaleString()}`;
  switch (budgetType) {
    case 'hourly':
      return `${formatted}/hr`;
    case 'negotiable':
      return `${formatted} (negotiable)`;
    default:
      return formatted;
  }
};
