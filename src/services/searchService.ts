/**
 * Search Service
 * Log and retrieve search queries via the backend API.
 */

import { api } from './api';

export interface SearchLogItem {
  id: string;
  query: string;
  createdAt: string;
}

/**
 * Log a user's search query to the backend.
 */
export async function logSearch(
  userId: string,
  query: string,
): Promise<SearchLogItem | null> {
  if (!query.trim()) return null;
  return api.post<SearchLogItem>('/searches', { userId, query: query.trim() });
}

/**
 * Fetch the user's most recent search queries.
 */
export async function fetchRecentSearches(
  userId: string,
): Promise<SearchLogItem[]> {
  return api.get<SearchLogItem[]>(
    `/searches/recent?userId=${encodeURIComponent(userId)}`,
  );
}

/**
 * Fetch ALL search logs for a user (for the management screen).
 */
export async function fetchAllSearches(
  userId: string,
): Promise<SearchLogItem[]> {
  return api.get<SearchLogItem[]>(
    `/searches?userId=${encodeURIComponent(userId)}`,
  );
}

/**
 * Delete a search log entry by ID.
 */
export async function deleteSearchLog(id: string): Promise<void> {
  return api.delete<void>(`/searches/${id}`);
}
