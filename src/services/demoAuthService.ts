/**
 * demoAuthService
 * Centralised "Continue as demo account" sign-in.
 *
 * Unlike Google/Apple sign-in this needs no third-party SDK — it simply asks
 * the backend for the shared demo user and stores the result in the auth
 * store, exactly like the other providers do.
 */

import { setAuthUser, clearAuth } from '../store/useAuthStore';
import { registerWithDemo } from './authService';

/**
 * Sign in as the shared demo account.  Throws (with the reason) on failure so
 * a failed sign-in can never leave the screen silently logged out.
 */
export async function signInAsDemo(): Promise<void> {
  const user = await registerWithDemo();
  if (!user?.id) {
    clearAuth();
    throw new Error('backend returned no user object');
  }

  setAuthUser({ ...user, provider: 'demo' });
}
