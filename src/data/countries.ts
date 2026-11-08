/**
 * countries.ts
 * Curated list of commonly used countries with their international dialing
 * codes and mobile-number metadata, plus small phone-number helpers.
 *
 * `nationalLength` is the number of *national significant* digits a mobile
 * number has — i.e. after removing the leading trunk zero (0) and the country
 * code. Optional `format` templates drive live display spacing where known
 * ('#' stands for one digit); countries without a template render as plain
 * digits.
 */

export interface Country {
  /** ISO 3166-1 alpha-2 code (uppercase). */
  iso: string;
  name: string;
  /** International dialing code WITHOUT the leading '+' (e.g. "63"). */
  dialCode: string;
  /** National significant digits of a mobile number. */
  nationalLength: number;
  /** Optional display template; '#' is a digit, everything else is literal. */
  format?: string;
  /** Optional input placeholder. */
  placeholder?: string;
  /** Emoji flag, derived from the ISO code. */
  flagEmoji: string;
}

export const PH_ISO = 'PH';

/** Convert an ISO alpha-2 code to its emoji flag character. */
function flagEmoji(iso: string): string {
  return iso
    .toUpperCase()
    .replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

// Order is intentional: the Philippines is the default and is listed first.
const COUNTRIES_RAW: Omit<Country, 'flagEmoji'>[] = [
  // Asia-Pacific
  {
    iso: 'PH',
    name: 'Philippines',
    dialCode: '63',
    nationalLength: 10,
    format: '### ### ####',
    placeholder: '9XX XXX XXXX',
  },
  { iso: 'SG', name: 'Singapore', dialCode: '65', nationalLength: 8 },
  { iso: 'MY', name: 'Malaysia', dialCode: '60', nationalLength: 9 },
  { iso: 'ID', name: 'Indonesia', dialCode: '62', nationalLength: 10 },
  { iso: 'TH', name: 'Thailand', dialCode: '66', nationalLength: 9 },
  { iso: 'VN', name: 'Vietnam', dialCode: '84', nationalLength: 9 },
  { iso: 'HK', name: 'Hong Kong', dialCode: '852', nationalLength: 8 },
  { iso: 'TW', name: 'Taiwan', dialCode: '886', nationalLength: 9 },
  { iso: 'JP', name: 'Japan', dialCode: '81', nationalLength: 10 },
  { iso: 'KR', name: 'South Korea', dialCode: '82', nationalLength: 10 },
  { iso: 'CN', name: 'China', dialCode: '86', nationalLength: 11 },
  { iso: 'IN', name: 'India', dialCode: '91', nationalLength: 10 },
  { iso: 'PK', name: 'Pakistan', dialCode: '92', nationalLength: 10 },
  { iso: 'BD', name: 'Bangladesh', dialCode: '880', nationalLength: 10 },
  { iso: 'LK', name: 'Sri Lanka', dialCode: '94', nationalLength: 9 },
  { iso: 'NP', name: 'Nepal', dialCode: '977', nationalLength: 10 },
  { iso: 'AU', name: 'Australia', dialCode: '61', nationalLength: 9 },
  { iso: 'NZ', name: 'New Zealand', dialCode: '64', nationalLength: 8 },
  // Americas
  {
    iso: 'US',
    name: 'United States',
    dialCode: '1',
    nationalLength: 10,
    format: '(###) ###-####',
    placeholder: '(XXX) XXX-XXXX',
  },
  { iso: 'CA', name: 'Canada', dialCode: '1', nationalLength: 10 },
  { iso: 'MX', name: 'Mexico', dialCode: '52', nationalLength: 10 },
  { iso: 'BR', name: 'Brazil', dialCode: '55', nationalLength: 11 },
  { iso: 'AR', name: 'Argentina', dialCode: '54', nationalLength: 10 },
  { iso: 'CL', name: 'Chile', dialCode: '56', nationalLength: 9 },
  { iso: 'CO', name: 'Colombia', dialCode: '57', nationalLength: 10 },
  { iso: 'PE', name: 'Peru', dialCode: '51', nationalLength: 9 },

  // Europe
  {
    iso: 'GB',
    name: 'United Kingdom',
    dialCode: '44',
    nationalLength: 10,
    format: '#### ######',
  },
  { iso: 'IE', name: 'Ireland', dialCode: '353', nationalLength: 9 },
  { iso: 'FR', name: 'France', dialCode: '33', nationalLength: 9 },
  { iso: 'DE', name: 'Germany', dialCode: '49', nationalLength: 10 },
  { iso: 'IT', name: 'Italy', dialCode: '39', nationalLength: 9 },
  { iso: 'ES', name: 'Spain', dialCode: '34', nationalLength: 9 },
  { iso: 'PT', name: 'Portugal', dialCode: '351', nationalLength: 9 },
  { iso: 'NL', name: 'Netherlands', dialCode: '31', nationalLength: 9 },
  { iso: 'BE', name: 'Belgium', dialCode: '32', nationalLength: 9 },
  { iso: 'CH', name: 'Switzerland', dialCode: '41', nationalLength: 9 },
  { iso: 'SE', name: 'Sweden', dialCode: '46', nationalLength: 9 },
  { iso: 'NO', name: 'Norway', dialCode: '47', nationalLength: 8 },
  { iso: 'DK', name: 'Denmark', dialCode: '45', nationalLength: 8 },
  { iso: 'FI', name: 'Finland', dialCode: '358', nationalLength: 9 },
  { iso: 'PL', name: 'Poland', dialCode: '48', nationalLength: 9 },
  { iso: 'CZ', name: 'Czechia', dialCode: '420', nationalLength: 9 },
  { iso: 'GR', name: 'Greece', dialCode: '30', nationalLength: 10 },
  { iso: 'TR', name: 'Turkey', dialCode: '90', nationalLength: 10 },
  { iso: 'RU', name: 'Russia', dialCode: '7', nationalLength: 10 },
  { iso: 'UA', name: 'Ukraine', dialCode: '380', nationalLength: 9 },
  // Middle East & Africa
  {
    iso: 'AE',
    name: 'United Arab Emirates',
    dialCode: '971',
    nationalLength: 9,
  },
  { iso: 'SA', name: 'Saudi Arabia', dialCode: '966', nationalLength: 9 },
  { iso: 'QA', name: 'Qatar', dialCode: '974', nationalLength: 8 },
  { iso: 'KW', name: 'Kuwait', dialCode: '965', nationalLength: 8 },
  { iso: 'EG', name: 'Egypt', dialCode: '20', nationalLength: 10 },
  { iso: 'ZA', name: 'South Africa', dialCode: '27', nationalLength: 9 },
  { iso: 'NG', name: 'Nigeria', dialCode: '234', nationalLength: 10 },
  { iso: 'KE', name: 'Kenya', dialCode: '254', nationalLength: 9 },
];

export const COUNTRIES: Country[] = COUNTRIES_RAW.map(c => ({
  ...c,
  flagEmoji: flagEmoji(c.iso),
}));

const byIso = new Map(COUNTRIES.map(c => [c.iso, c]));
const byDial = new Map<string, Country[]>();
COUNTRIES.forEach(c => {
  const arr = byDial.get(c.dialCode) ?? [];
  arr.push(c);
  byDial.set(c.dialCode, arr);
});

export function getCountryByIso(iso?: string): Country | undefined {
  if (!iso) return undefined;
  return byIso.get(iso.toUpperCase());
}

export function getCountryByDialCode(dialCode: string): Country | undefined {
  return byDial.get(dialCode)?.[0];
}

// ---------------------------------------------------------------------------
// Phone number helpers (national significant digits, no leading '0').
// ---------------------------------------------------------------------------

export const DEFAULT_COUNTRY: Country = getCountryByIso(PH_ISO)!;

/** Strip IDD '00', a country code, and a leading trunk zero to get national digits. */
export function toNationalDigits(raw: string, country?: Country): string {
  let d = raw.replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00') && d.length > 2) d = d.slice(2);
  const dial = country?.dialCode ?? DEFAULT_COUNTRY.dialCode;
  if (dial && d.startsWith(dial) && d.length > dial.length)
    d = d.slice(dial.length);
  if (d.startsWith('0')) d = d.slice(1);
  return d;
}

/** Truncate to the country's national significant length. */
export function truncateNational(digits: string, country?: Country): string {
  const len = country?.nationalLength ?? DEFAULT_COUNTRY.nationalLength;
  return digits.slice(0, len);
}

/** Apply a display format template ('#' = digit) if the country has one. */
export function formatNationalDigits(
  digits: string,
  country?: Country,
): string {
  const template = country?.format;
  if (!template) return digits;
  let i = 0;
  return template.replace(/#/g, () => digits[i++] ?? '');
}

/** Validate national significant digits against the country's rules. */
export function isValidNational(
  country: Country | undefined,
  digits: string,
): boolean {
  const c = country ?? DEFAULT_COUNTRY;
  const national = truncateNational(toNationalDigits(digits, c), c);
  if (national.length !== c.nationalLength) return false;
  // The Philippines requires mobile numbers to start with '9'.
  if (c.iso === 'PH') return /^9\d{9}$/.test(national);
  return true;
}

/** Build an E.164 international number, e.g. +639171234567. */
export function buildE164(
  country: Country | undefined,
  digits: string,
): string {
  const c = country ?? DEFAULT_COUNTRY;
  const national = truncateNational(toNationalDigits(digits, c), c);
  return `+${c.dialCode}${national}`;
}
