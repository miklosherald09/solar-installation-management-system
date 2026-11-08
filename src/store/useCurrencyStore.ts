import { create } from 'zustand';
import {
  getCurrentLocationInfo,
  reverseGeocodeCountry,
} from '../services/geocodeService';
import {
  getCurrencySymbolFromAddress,
  getCurrencySymbolFromCoords,
  countryToCurrencySymbol,
} from '../utils/currencyUtils';

interface CurrencyStore {
  deviceLocation: {
    latitude: number;
    longitude: number;
    address?: string;
  } | null;
  resolvedCurrencies: Record<string, string>; // cache of key "lat,lon" -> currency symbol
  deviceCurrencySymbol: string;
  fetchDeviceLocation: () => Promise<void>;
  resolveCoordsCurrency: (lat: number, lon: number) => Promise<string | null>;
}

export const useCurrencyStore = create<CurrencyStore>((set, get) => ({
  deviceLocation: null,
  resolvedCurrencies: {},
  deviceCurrencySymbol: '₱', // default/fallback

  fetchDeviceLocation: async () => {
    try {
      const info = await getCurrentLocationInfo();
      const { latitude, longitude, address } = info;
      let symbol = '₱';
      if (latitude != null && longitude != null) {
        // Try offline coords lookup first
        let resolved = getCurrencySymbolFromCoords(latitude, longitude);
        if (!resolved) {
          // Try reverse geocoding
          try {
            const countryCode = await reverseGeocodeCountry(
              latitude,
              longitude,
            );
            resolved = countryToCurrencySymbol[countryCode] || '$';
          } catch {
            // ignore
          }
        }
        if (resolved) {
          symbol = resolved;
        } else if (address) {
          symbol = getCurrencySymbolFromAddress(address) || '₱';
        }
        set({
          deviceLocation: { latitude, longitude, address },
          deviceCurrencySymbol: symbol,
        });
      }
    } catch (err) {
      console.warn('[CurrencyStore] failed to fetch device location:', err);
    }
  },

  resolveCoordsCurrency: async (lat, lon) => {
    const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    const cache = get().resolvedCurrencies;
    if (cache[key]) return cache[key];

    // Try offline lookup first
    const offlineSymbol = getCurrencySymbolFromCoords(lat, lon);
    if (offlineSymbol) {
      set(state => ({
        resolvedCurrencies: {
          ...state.resolvedCurrencies,
          [key]: offlineSymbol,
        },
      }));
      return offlineSymbol;
    }

    // Fall back to reverse geocode
    try {
      const countryCode = await reverseGeocodeCountry(lat, lon);
      const onlineSymbol = countryToCurrencySymbol[countryCode] || '$';
      set(state => ({
        resolvedCurrencies: {
          ...state.resolvedCurrencies,
          [key]: onlineSymbol,
        },
      }));
      return onlineSymbol;
    } catch (err) {
      console.warn('[CurrencyStore] reverseGeocodeCountry failed:', err);
      return null;
    }
  },
}));
