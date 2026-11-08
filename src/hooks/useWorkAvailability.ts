/**
 * Hook for reading and mutating the authenticated user's work availability status.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore, setAuthUserWorkAvailability } from '../store/useAuthStore';
import { updateUserWorkAvailability } from '../services/userService';
import { userSearchKeys } from './useUsers';
import { nearbyWorkerKeys } from './useNearbyWorkers';
import type { WorkAvailability } from '../types';

export function useUpdateWorkAvailability() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (newAvailability: WorkAvailability) => {
      if (!user?.id) throw new Error('Not authenticated');
      // Optimistically update local store immediately for instant UX
      setAuthUserWorkAvailability(newAvailability);
      return updateUserWorkAvailability(user.id, newAvailability);
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: userSearchKeys.detail(user.id),
        });
      }
      queryClient.invalidateQueries({ queryKey: nearbyWorkerKeys.all });
    },
    onError: (_err, _variables, context: any) => {
      // Revert if previous availability was stored
      if (context?.previousAvailability) {
        setAuthUserWorkAvailability(context.previousAvailability);
      }
    },
    onMutate: () => {
      return { previousAvailability: user?.workAvailability };
    },
  });
}
