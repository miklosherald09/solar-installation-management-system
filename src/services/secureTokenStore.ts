/**
 * secureTokenStore
 * Persists access + refresh tokens in the platform's secure storage:
 *   - iOS: Keychain
 *   - Android: Keystore-backed EncryptedSharedPreferences
 *
 * Backed by `react-native-keychain` (a native module).  The access token is
 * stored as the "username" and the refresh token as the "password" — both are
 * encrypted at rest by the OS.
 */

import * as Keychain from 'react-native-keychain';

const SERVICE = 'com.solarimsys.auth';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export async function saveTokens(tokens: StoredTokens): Promise<void> {
  await Keychain.setGenericPassword(tokens.accessToken, tokens.refreshToken, {
    service: SERVICE,
    storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
  });
}

export async function loadTokens(): Promise<StoredTokens | null> {
  try {
    const credentials = await Keychain.getGenericPassword({ service: SERVICE });
    if (!credentials) {
      return null;
    }
    return {
      accessToken: credentials.username,
      refreshToken: credentials.password,
    };
  } catch (err) {
    console.warn('[secureTokenStore] failed to load tokens:', err);
    try {
      await clearTokens();
    } catch {
      // Ignore reset failure
    }
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  await Keychain.resetGenericPassword({ service: SERVICE });
}
