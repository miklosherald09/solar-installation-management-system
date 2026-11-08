/**
 * Geocode Service
 * Place search + reverse geocoding using the free OpenStreetMap Nominatim
 * API (no API key required), plus a helper to grab the device's current
 * location via @react-native-community/geolocation.
 *
 * Nominatim usage policy: https://operations.osmfoundation.org/policies/nominatim/
 * Keep request volume low (~1 req/sec). We trigger searches on submit and
 * reverse-geocode (debounced) only when the map settles after a pan.
 */

import { Platform } from 'react-native';
import Geolocation, {
  GeolocationResponse,
  GeolocationError,
  GeolocationOptions,
} from '@react-native-community/geolocation';
import { LocationInfo } from '../types';
import { NOMINATIM_BASE } from '../constants/env';

// Nominatim policy requires identifying the calling application.
const HEADERS: Record<string, string> = {
  'User-Agent': 'solarimsys/1.0 (react-native)',
  'Accept-Language': 'en',
};

export interface PlaceResult {
  id: string;
  label: string; // full display name
  address: string;
  latitude: number;
  longitude: number;
}

interface NominatimSearchItem {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
}

interface NominatimAddress {
  road?: string;
  pedestrian?: string;
  neighbourhood?: string;
  suburb?: string;
  city_district?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  region?: string;
  postcode?: string;
  country?: string;
}

interface NominatimReverse {
  display_name: string;
  address?: NominatimAddress & { country_code?: string };
  error?: string;
}

/** Build a concise, human-readable address from a Nominatim reverse result. */
function buildShortAddress(r: NominatimReverse): string {
  const a = r.address;
  if (!a) return r.display_name;
  const street = [a.road ?? a.pedestrian, a.neighbourhood, a.suburb]
    .filter(Boolean)
    .join(', ');
  const city =
    a.city ?? a.town ?? a.village ?? a.municipality ?? a.city_district;
  const region = [city, a.county, a.state ?? a.region, a.postcode]
    .filter(Boolean)
    .join(', ');
  const parts = [street, region, a.country].filter(Boolean);
  return parts.length ? parts.join(', ') : r.display_name;
}

/** Search places by free-text query. Returns up to `limit` matches. */
export async function searchPlaces(
  query: string,
  limit = 6,
): Promise<PlaceResult[]> {
  const q = query.trim();
  if (!q) return [];
  const url = `${NOMINATIM_BASE}/search?format=jsonv2&q=${encodeURIComponent(
    q,
  )}&limit=${limit}&addressdetails=1`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  const data = (await res.json()) as NominatimSearchItem[];
  return data.map(item => ({
    id: String(item.place_id),
    label: item.display_name,
    address: item.display_name,
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon),
  }));
}

/** Build a concise city/province-only address from structured Nominatim fields. */
function buildConciseAddress(r: NominatimReverse): string {
  const a = r.address;
  if (!a) return '';
  const city =
    a.city ?? a.town ?? a.village ?? a.municipality ?? a.city_district;
  const state = a.state ?? a.region ?? a.county;
  return [city, state].filter(Boolean).join(', ');
}

export interface ReverseGeocodeResult {
  /** Full human-readable address. */
  address: string;
  /** Short city/state address. */
  conciseAddress: string;
}

let _lastReverseGeocode: {
  lat: number;
  lon: number;
  timestamp: number;
  result: ReverseGeocodeResult;
} | null = null;

/** Reverse-geocode into both full and concise addresses. */
export async function reverseGeocodeInfo(
  lat: number,
  lon: number,
): Promise<ReverseGeocodeResult> {
  if (
    _lastReverseGeocode &&
    Math.abs(_lastReverseGeocode.lat - lat) < 0.0001 &&
    Math.abs(_lastReverseGeocode.lon - lon) < 0.0001 &&
    Date.now() - _lastReverseGeocode.timestamp < 60000
  ) {
    return _lastReverseGeocode.result;
  }

  const url = `${NOMINATIM_BASE}/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Reverse geocode failed (${res.status})`);
  const data = (await res.json()) as NominatimReverse;
  if (data.error) throw new Error(data.error);
  const result: ReverseGeocodeResult = {
    address: buildShortAddress(data),
    conciseAddress: buildConciseAddress(data),
  };
  _lastReverseGeocode = { lat, lon, timestamp: Date.now(), result };
  return result;
}

/** Reverse-geocode coordinates into a human-readable address. */
export async function reverseGeocode(
  lat: number,
  lon: number,
): Promise<string> {
  const { address } = await reverseGeocodeInfo(lat, lon);
  return address;
}

/** Convert a coordinate into a LocationInfo (address + coords). */
export async function geocodeCoordinate(
  lat: number,
  lon: number,
): Promise<LocationInfo> {
  const { address, conciseAddress } = await reverseGeocodeInfo(lat, lon);
  return { address, conciseAddress, latitude: lat, longitude: lon };
}

function requestAuth(): Promise<void> {
  // On Android the native getCurrentPosition method already calls
  // requestAuthorization internally. Calling it again before getCurrentPosition
  // is redundant and can hang indefinitely if PermissionsModule is unavailable.
  if (Platform.OS === 'android') {
    return Promise.resolve();
  }

  // iOS: request authorization before fetching the position so we surface
  // permission denials gracefully. Add a 5 s timeout so the promise never
  // hangs permanently.
  return new Promise(resolve => {
    let settled = false;
    const done = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    const timer = setTimeout(done, 5000);

    try {
      Geolocation.requestAuthorization(done, done);
    } catch {
      clearTimeout(timer);
      done();
    }
  });
}

function getPositionWithOptions(
  options: GeolocationOptions,
): Promise<GeolocationResponse> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      pos => resolve(pos),
      err => reject(err),
      options,
    );
  });
}

/** Turn a native GeolocationError into a message worth showing the user. */
function friendlyLocationMessage(err: GeolocationError): string {
  switch (err?.code) {
    case 1: // PERMISSION_DENIED
      return 'Location permission is not granted.';
    case 2: // POSITION_UNAVAILABLE
      return 'No location provider is available. Turn on Location (GPS) in your device settings.';
    case 3: // TIMEOUT
      return 'Could not determine your location in time. Please try again.';
    default:
      return err?.message || 'Could not get your current location.';
  }
}

async function getPosition(): Promise<GeolocationResponse> {
  // A 60 s maximumAge lets us reuse a recent cached fix (e.g. from the
  // currency-store cold start) so we avoid a fresh GPS acquisition on every
  // call.  The 15 s timeout still bounds the worst-case wait for a new fix.
  const base: GeolocationOptions = { timeout: 15000, maximumAge: 60000 };

  // On Android, high accuracy (GPS) can fail with "no location provider
  // available" when the user granted only "approximate" (coarse) location, or
  // when the GPS provider is disabled. Fall back to the network provider
  // (coarse) before surfacing an error.
  try {
    return await getPositionWithOptions({ ...base, enableHighAccuracy: true });
  } catch (highAccuracyErr) {
    console.log(
      '[geocodeService] High-accuracy location failed, falling back to coarse:',
      (highAccuracyErr as GeolocationError)?.message ?? highAccuracyErr,
    );
    // Fall through to the network-provider attempt below.
  }

  try {
    return await getPositionWithOptions({ ...base, enableHighAccuracy: false });
  } catch (err) {
    throw new Error(friendlyLocationMessage(err as GeolocationError));
  }
}

/**
 * Get the device's current location and reverse-geocode it to an address.
 * Throws a descriptive Error if permission is denied or location is unavailable.
 */
export async function getCurrentLocationInfo(): Promise<LocationInfo> {
  await requestAuth();
  const pos = await getPosition();
  const { latitude, longitude } = pos.coords;
  let address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  let conciseAddress = '';
  try {
    const info = await reverseGeocodeInfo(latitude, longitude);
    address = info.address;
    conciseAddress = info.conciseAddress;
  } catch {
    // fall back to a coordinate string if reverse geocoding fails
  }
  return { address, conciseAddress, latitude, longitude };
}

/**
 * Reverse-geocode coordinates into an ISO 3166-1 alpha-2 country code
 * (uppercase). Throws if the country cannot be determined.
 */
export async function reverseGeocodeCountry(
  lat: number,
  lon: number,
): Promise<string> {
  const url = `${NOMINATIM_BASE}/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Reverse geocode failed (${res.status})`);
  const data = (await res.json()) as NominatimReverse;
  if (data.error) throw new Error(data.error);
  const code = data.address?.country_code?.trim().toUpperCase();
  if (!code || code.length !== 2) {
    throw new Error('Could not determine country');
  }
  return code;
}

/**
 * Determine the device's current country (ISO alpha-2) via GPS +
 * reverse-geocoding. Reuses the same permission flow as getCurrentLocationInfo.
 */
export async function getCurrentCountryIso(): Promise<string> {
  await requestAuth();
  const pos = await getPosition();
  return reverseGeocodeCountry(pos.coords.latitude, pos.coords.longitude);
}
