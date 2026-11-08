import { create } from 'zustand';

export type UserPresenceStatus = 'ONLINE' | 'BUSY' | 'OFFLINE' | string;

export interface UserPresence {
  userId: string;
  isOnline: boolean;
  status: UserPresenceStatus;
  lastHeartbeatAt?: string | null;
}

interface PresenceState {
  presences: Record<string, UserPresence>;
  setPresence: (
    userId: string,
    isOnline: boolean,
    status?: UserPresenceStatus,
    lastHeartbeatAt?: string | null,
  ) => void;
  setBulkPresences: (presences: UserPresence[]) => void;
  getPresence: (userId?: string | null) => UserPresence | undefined;
  clearPresences: () => void;
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  presences: {},

  setPresence: (userId, isOnline, status = isOnline ? 'ONLINE' : 'OFFLINE', lastHeartbeatAt = null) => {
    if (!userId) return;
    set(state => ({
      presences: {
        ...state.presences,
        [userId]: {
          userId,
          isOnline: !!isOnline,
          status,
          lastHeartbeatAt: lastHeartbeatAt ?? state.presences[userId]?.lastHeartbeatAt ?? null,
        },
      },
    }));
  },

  setBulkPresences: (presencesList: UserPresence[]) => {
    if (!Array.isArray(presencesList)) return;
    set(state => {
      const next = { ...state.presences };
      for (const p of presencesList) {
        if (p?.userId) {
          next[p.userId] = {
            userId: p.userId,
            isOnline: !!p.isOnline,
            status: p.status || (p.isOnline ? 'ONLINE' : 'OFFLINE'),
            lastHeartbeatAt: p.lastHeartbeatAt ?? next[p.userId]?.lastHeartbeatAt ?? null,
          };
        }
      }
      return { presences: next };
    });
  },

  getPresence: (userId?: string | null) => {
    if (!userId) return undefined;
    return get().presences[userId];
  },

  clearPresences: () => set({ presences: {} }),
}));
