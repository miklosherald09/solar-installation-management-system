/**
 * NearMe Store
 * Module-level cache holding the near-me search form state.
 * Persisted to the backend (PostgreSQL) via the /users/:id/near-me endpoint
 * and loaded from the auth response when the user signs in.
 */

import { useSyncExternalStore } from 'react';
import { LocationInfo } from '../types';

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

interface NearMeState {
  /** Human-readable address shown in the modal */
  location: string;
  /** Short city/state address (shown in the home feed filter label). */
  conciseLocation: string;
  latitude: number | undefined;
  longitude: number | undefined;
  /** Search radius in kilometres */
  rangeKm: number;
  /** Whether the near-me filter is currently active on the home feed. */
  active: boolean;
}

const initialState: NearMeState = {
  location: '',
  conciseLocation: '',
  latitude: undefined,
  longitude: undefined,
  rangeKm: 5,
  active: false,
};

let _state: NearMeState = { ...initialState };
const _listeners = new Set<() => void>();

function _emit() {
  _listeners.forEach(fn => fn());
}

// ---------------------------------------------------------------------------
// Public helpers (usable outside React – from map / location picks)
// ---------------------------------------------------------------------------

export function applyNearMeLocation(loc: LocationInfo) {
  _state = {
    ..._state,
    location: loc.address,
    conciseLocation: loc.conciseAddress ?? '',
    latitude: loc.latitude,
    longitude: loc.longitude,
  };
  _emit();
}

export function setNearMeRange(km: number) {
  _state = { ..._state, rangeKm: km };
  _emit();
}

/**
 * Turn the near-me filter on. Used when a location is loaded/hydrated on
 * startup so the home feed filter activates automatically.
 */
export function activateNearMe() {
  _state = { ..._state, active: true };
  _emit();
}

export function clearNearMe() {
  _state = { ...initialState };
  _emit();
}

export function getNearMeState(): Readonly<NearMeState> {
  return _state;
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

export function useNearMeStore() {
  const snapshot = useSyncExternalStore(
    (cb: () => void) => {
      _listeners.add(cb);
      return () => {
        _listeners.delete(cb);
      };
    },
    () => _state,
  );

  const setters = {
    setLocation: (v: string) => {
      _state = { ..._state, location: v };
      _emit();
    },
    setConciseLocation: (v: string) => {
      _state = { ..._state, conciseLocation: v };
      _emit();
    },
    setLatitude: (v: number | undefined) => {
      _state = { ..._state, latitude: v };
      _emit();
    },
    setLongitude: (v: number | undefined) => {
      _state = { ..._state, longitude: v };
      _emit();
    },
    setRangeKm: (v: number) => {
      _state = { ..._state, rangeKm: v };
      _emit();
    },
    reset: () => clearNearMe(),
  };

  return { ...snapshot, ...setters };
}
