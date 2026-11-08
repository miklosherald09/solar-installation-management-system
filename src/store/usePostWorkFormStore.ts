/**
 * PostWorkForm Store
 * Module-level cache that persists form state across navigation and screen
 * remounts.  React Navigation's native-stack detaches previous screens on
 * Android, so component-local state is lost.  A plain module-scoped object
 * survives React lifecycle - used by PostWorkScreen (read/write via hook)
 * and by SelectLocation / SelectWorkType (write via get/set functions).
 */

import { useSyncExternalStore } from 'react';
import {
  WorkCategory,
  LocationInfo,
  WorkType,
  WorkDurationUnit,
} from '../types';

// ---------------------------------------------------------------------------
// Module-level state (persistent across component mount/unmount)
// ---------------------------------------------------------------------------

interface FormState {
  mobileNumber: string;
  /** ISO 3166-1 alpha-2 code of the selected country (e.g. "PH"). */
  countryIso: string;
  description: string;
  category: WorkCategory | null;
  categories: WorkCategory[];
  budget: string;
  budgetType: 'fixed' | 'hourly' | 'negotiable';
  location: string;
  latitude: number | undefined;
  longitude: number | undefined;
  scheduledDate: string;
  tags: string;
  durationValue: string;
  durationUnit: WorkDurationUnit | '';
  images: string[];
}

const initialState: FormState = {
  mobileNumber: '',
  countryIso: '',
  description: '',
  category: null,
  categories: [],
  budget: '300',
  budgetType: 'fixed',
  location: '',
  latitude: undefined,
  longitude: undefined,
  scheduledDate: '',
  tags: '',
  durationValue: '',
  durationUnit: '',
  images: [],
};

let _state: FormState = { ...initialState };
const _listeners = new Set<() => void>();

function _emit() {
  _listeners.forEach(fn => fn());
}

// ---------------------------------------------------------------------------
// Public helpers for SelectLocation / SelectWorkType (no hook needed)
// ---------------------------------------------------------------------------

export function applyLocation(loc: LocationInfo) {
  _state = {
    ..._state,
    location: loc.address,
    latitude: loc.latitude,
    longitude: loc.longitude,
  };
  _emit();
}

export function applyWorkType(wt: WorkType) {
  _state = {
    ..._state,
    category: wt.slug as WorkCategory,
    categories: [wt.slug as WorkCategory],
  };
  _emit();
}

export function applyWorkTypes(workTypes: WorkType[]) {
  const slugs = workTypes.map(wt => wt.slug as WorkCategory);
  _state = {
    ..._state,
    categories: slugs,
    category: slugs[0] ?? null,
  };
  _emit();
}

export function applyImages(urls: string[]) {
  _state = {
    ..._state,
    images: urls,
  };
  _emit();
}

export function resetFormState() {
  _state = { ...initialState };
  _emit();
}

// ---------------------------------------------------------------------------
// React hook for PostWorkScreen
// ---------------------------------------------------------------------------

export function usePostWorkFormStore() {
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
    setMobileNumber: (v: string) => {
      _state = { ..._state, mobileNumber: v };
      _emit();
    },
    setCountryIso: (v: string) => {
      _state = { ..._state, countryIso: v };
      _emit();
    },
    setDescription: (v: string) => {
      _state = { ..._state, description: v };
      _emit();
    },
    setCategory: (v: WorkCategory | null) => {
      _state = {
        ..._state,
        category: v,
        categories: v ? [v] : [],
      };
      _emit();
    },
    setCategories: (v: WorkCategory[]) => {
      _state = {
        ..._state,
        categories: v,
        category: v[0] ?? null,
      };
      _emit();
    },
    setBudget: (v: string) => {
      _state = { ..._state, budget: v };
      _emit();
    },
    setBudgetType: (v: 'fixed' | 'hourly' | 'negotiable') => {
      _state = { ..._state, budgetType: v };
      _emit();
    },
    setLocation: (v: string) => {
      _state = { ..._state, location: v };
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
    setScheduledDate: (v: string) => {
      _state = { ..._state, scheduledDate: v };
      _emit();
    },
    setTags: (v: string) => {
      _state = { ..._state, tags: v };
      _emit();
    },
    setDurationValue: (v: string) => {
      _state = { ..._state, durationValue: v };
      _emit();
    },
    setDurationUnit: (v: WorkDurationUnit | '') => {
      _state = { ..._state, durationUnit: v };
      _emit();
    },
    setImages: (v: string[]) => {
      _state = { ..._state, images: v };
      _emit();
    },
    reset: () => resetFormState(),
  };

  return { ...snapshot, ...setters };
}
