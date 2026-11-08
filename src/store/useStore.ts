/**
 * Zustand store for the Solar Installation Management System app
 * Local state management with API-backed operations
 */

import { create } from 'zustand';
import { Work, WorkCategory } from '../types';
import { getAuthState } from './useAuthStore';
import { createWork as apiCreateWork } from '../services/workService';
import { api } from '../services/api';

interface AppState {
  // Works (local cache, primarily driven by React Query)
  works: Work[];
  selectedCategory: WorkCategory | null;
  searchQuery: string;

  // Actions
  setSelectedCategory: (category: WorkCategory | null) => void;
  setSearchQuery: (query: string) => void;
  setWorks: (works: Work[]) => void;

  /**
   * Add a new work by calling the backend API.
   */
  addWork: (
    workData: Omit<Work, 'id' | 'createdAt' | 'applicants' | 'postedBy'>,
  ) => Promise<Work>;
  getWorkById: (id: string) => Work | undefined;
  getFilteredWorks: () => Work[];

  /**
   * Apply to a work: sends request to backend.
   */
  applyToWork: (workId: string) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  works: [],
  selectedCategory: null,
  searchQuery: '',

  setSelectedCategory: (category: WorkCategory | null) =>
    set({ selectedCategory: category }),

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  setWorks: (works: Work[]) => set({ works }),

  /**
   * Add a new work via the backend API.
   */
  addWork: async workData => {
    const currentUserId = getAuthState().user?.id || '';
    const newWork = await apiCreateWork({
      ...workData,
      postedBy: currentUserId,
    });
    set(state => ({ works: [newWork, ...state.works] }));
    return newWork;
  },

  getWorkById: (id: string) => {
    return get().works.find(work => work.id === id);
  },

  getFilteredWorks: () => {
    const { works, selectedCategory, searchQuery } = get();
    let filtered = works;

    if (selectedCategory) {
      filtered = filtered.filter(work => work.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        work =>
          work.title?.toLowerCase().includes(query) ||
          work.description.toLowerCase().includes(query) ||
          work.location.toLowerCase().includes(query) ||
          work.tags?.some(tag => tag.toLowerCase().includes(query)),
      );
    }

    return filtered;
  },

  /**
   * Apply to a work: sends PATCH request to backend to increment applicants.
   */
  applyToWork: async (workId: string) => {
    try {
      // Call backend to apply
      await api.patch(`/works/${workId}`, {
        applicants:
          (get().works.find(w => w.id === workId)?.applicants ?? 0) + 1,
      });
    } catch {
      // Fallback: increment locally if API fails
    }
    set(state => ({
      works: state.works.map(work =>
        work.id === workId
          ? { ...work, applicants: work.applicants + 1 }
          : work,
      ),
    }));
  },
}));
