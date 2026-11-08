import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useCurrencyStore } from '../store/useCurrencyStore';
import {
  getCurrencySymbolFromAddress,
  getCurrencySymbolFromCoords,
} from '../utils/currencyUtils';

interface LocationContext {
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  currency?: string | null;
}

export function useWorkCurrency(context?: LocationContext | null): string {
  const { user } = useAuthStore();
  const { deviceCurrencySymbol, resolveCoordsCurrency, resolvedCurrencies } =
    useCurrencyStore();

  const [symbol, setSymbol] = React.useState('₱');

  React.useEffect(() => {
    // 0. Work's saved currency (Tier 0)
    if (context?.currency) {
      setSymbol(context.currency);
      return;
    }

    let resolved = false;

    // 1. Works location context (Tier 1)
    if (context) {
      // 1a. Parse location string
      if (context.location) {
        const s = getCurrencySymbolFromAddress(context.location);
        if (s) {
          setSymbol(s);
          return;
        }
      }

      // 1b. Parse coordinates (offline bounding box lookup)
      if (context.latitude != null && context.longitude != null) {
        const s = getCurrencySymbolFromCoords(
          context.latitude,
          context.longitude,
        );
        if (s) {
          setSymbol(s);
          return;
        }

        // 1c. Cached / Async geocode coordinates lookup
        const key = `${context.latitude.toFixed(2)},${context.longitude.toFixed(
          2,
        )}`;
        if (resolvedCurrencies[key]) {
          setSymbol(resolvedCurrencies[key]);
          return;
        }

        // Trigger background geocode request
        resolveCoordsCurrency(context.latitude, context.longitude).then(
          asyncSymbol => {
            if (asyncSymbol) setSymbol(asyncSymbol);
          },
        );
        resolved = true; // Wait for background async or fallback
      }
    }

    if (resolved) return;

    // 2. Users location saved on database (Tier 2)
    if (user) {
      // 2a. Parse user location string
      if (user.location) {
        const s = getCurrencySymbolFromAddress(user.location);
        if (s) {
          setSymbol(s);
          return;
        }
      }

      // 2b. Parse user coordinates (offline bounding box lookup)
      if (user.latitude != null && user.longitude != null) {
        const s = getCurrencySymbolFromCoords(user.latitude, user.longitude);
        if (s) {
          setSymbol(s);
          return;
        }

        // 2c. Cached / Async geocode coordinates lookup
        const key = `${user.latitude.toFixed(2)},${user.longitude.toFixed(2)}`;
        if (resolvedCurrencies[key]) {
          setSymbol(resolvedCurrencies[key]);
          return;
        }

        // Trigger background geocode request
        resolveCoordsCurrency(user.latitude, user.longitude).then(
          asyncSymbol => {
            if (asyncSymbol) setSymbol(asyncSymbol);
          },
        );
        resolved = true;
      }
    }

    if (resolved) return;

    // 3. User's current location / device location (Tier 3)
    setSymbol(deviceCurrencySymbol);
  }, [
    context,
    context?.location,
    context?.latitude,
    context?.longitude,
    context?.currency,
    user,
    user?.location,
    user?.latitude,
    user?.longitude,
    resolveCoordsCurrency,
    deviceCurrencySymbol,
    resolvedCurrencies,
  ]);

  return symbol;
}
