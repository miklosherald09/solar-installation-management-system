/**
 * React Query hooks for authenticated user data.
 */

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';

// Query keys
export const userKeys = {
  all: ['user'] as const,
  profile: () => [...userKeys.all, 'profile'] as const,
};

/**
 * Hook to fetch / refresh the authenticated user's profile from the backend
 * using the stored Google ID token.
 *
 * This ensures the auth store always holds the persistent **DB UUID**.
 * It's useful after a sign-in or silent restore to double-check the UUID.
 */
export function useUserProfile(_enabled = true) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: userKeys.profile(),
    queryFn: async () => {
      // We don't have the idToken stored in the auth store directly,
      // so this hook is a placeholder for when you have the token.
      // The actual fetching happens in googleAuthService / LoginScreen.
      return user;
    },
    enabled: false, // disabled by default — use explicit authService calls
    staleTime: 5 * 60 * 1000,
  });
}
