/**
 * React Query hooks for user search and profile lookup.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  searchUsers,
  fetchUserById,
  fetchBlockStatus,
  blockUser,
  unblockUser,
  toggleProBadge,
} from '../services/userService';
import { useAuthStore, setAuthUser } from '../store/useAuthStore';

// Query keys
export const userSearchKeys = {
  all: ['users'] as const,
  search: (q: string) => [...userSearchKeys.all, 'search', q] as const,
  detail: (id: string) => [...userSearchKeys.all, 'detail', id] as const,
  block: (viewerId: string, targetId: string) =>
    [...userSearchKeys.all, 'block', viewerId, targetId] as const,
};

/**
 * Search users by name/email. When enableEmpty is true, fetches all users if query is empty.
 */
export function useSearchUsers(
  query: string,
  options?: { enabled?: boolean; enableEmpty?: boolean },
) {
  const q = query.trim();
  const isEnabled =
    options?.enabled !== false && (options?.enableEmpty ? true : q.length > 0);
  return useQuery({
    queryKey: userSearchKeys.search(q),
    queryFn: () => searchUsers(q),
    enabled: isEnabled,
    staleTime: 30_000,
  });
}

/**
 * Fetch a single user profile by ID.
 */
export function useUserById(id: string) {
  return useQuery({
    queryKey: userSearchKeys.detail(id),
    queryFn: () => fetchUserById(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

/**
 * Block status between the current user (viewer) and a target user.
 * Disabled until both ids are known.
 */
export function useBlockStatus(viewerId: string | undefined, targetId: string) {
  return useQuery({
    queryKey: userSearchKeys.block(viewerId || '', targetId),
    queryFn: () => fetchBlockStatus(targetId),
    enabled: !!viewerId && !!targetId,
    staleTime: 30_000,
  });
}

/**
 * Block or unblock a user. Invalidates the block-status query on success so
 * the profile settings screen immediately reflects the new state.
 */
export function useBlockUserMutation(targetId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation<void, Error, 'block' | 'unblock'>({
    mutationFn: async (action: 'block' | 'unblock') => {
      if (action === 'block') {
        await blockUser(targetId);
      } else {
        await unblockUser(targetId);
      }
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: userSearchKeys.block(user.id, targetId),
        });
      }
    },
  });
}

/**
 * Toggle the "Verified Pro" badge status for a user.
 * Invalidates the user detail query (and works list) so that all views
 * immediately reflect the new verification status.
 */
export function useToggleProBadgeMutation(targetId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: () => toggleProBadge(targetId),
    onSuccess: updatedUser => {
      queryClient.invalidateQueries({
        queryKey: userSearchKeys.detail(targetId),
      });
      queryClient.invalidateQueries({
        queryKey: ['works'],
      });
      if (user?.id === targetId) {
        setAuthUser({
          ...user,
          verifiedAt: updatedUser.verifiedAt,
          verifiedByUserId: updatedUser.verifiedByUserId,
        });
      }
    },
  });
}
