/**
 * Device Identity
 * Generates a persistent UUID for this device on first launch
 * and stores it in AsyncStorage. Used to identify the device
 * in the backend for push notification token management.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = '@solarimsys:device_id';

let _cachedDeviceId: string | null = null;

/** Get or create a persistent device identity. */
export async function getDeviceId(): Promise<string> {
  if (_cachedDeviceId) return _cachedDeviceId;

  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) {
      _cachedDeviceId = stored;
      return stored;
    }
  } catch {
    // Fall through to generate a new one
  }

  // Generate a simple UUID-like ID
  const id =
    'd_' +
    Math.random().toString(36).substring(2, 15) +
    Date.now().toString(36);

  _cachedDeviceId = id;

  try {
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  } catch {
    // Best effort
  }

  return id;
}
