/**
 * Work Reaction Service
 * Data layer for work reactions via the backend NestJS API.
 * Endpoints: /works/:workId/reactions
 */

import { api } from './api';
import type { WorkReactionSummary } from '../types';

/**
 * Fetch reaction summary for a work.
 */
export async function fetchWorkReactions(
  workId: string,
  userId?: string,
): Promise<WorkReactionSummary> {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  const result = await api.get<WorkReactionSummary>(
    `/works/${encodeURIComponent(workId)}/reactions${query}`,
  );
  return {
    workId,
    totalCount: result?.totalCount ?? 0,
    userReaction: result?.userReaction ?? null,
    counts: result?.counts ?? {},
    reactions: result?.reactions ?? [],
  };
}

/**
 * React to a work listing (defaults to 👍).
 * If the user already reacted with the same emoji, the backend toggles it off.
 * If the user selected a different emoji, it updates to the new one.
 */
export async function toggleWorkReaction(
  workId: string,
  reaction = '👍',
  userId?: string,
): Promise<WorkReactionSummary> {
  const result = await api.post<WorkReactionSummary>(
    `/works/${encodeURIComponent(workId)}/reactions`,
    { reaction, userId },
  );
  return {
    workId,
    totalCount: result?.totalCount ?? 0,
    userReaction: result?.userReaction ?? null,
    counts: result?.counts ?? {},
    reactions: result?.reactions ?? [],
  };
}

/**
 * Explicitly remove a reaction from a work.
 */
export async function removeWorkReaction(
  workId: string,
  userId?: string,
): Promise<WorkReactionSummary> {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  const result = await api.delete<WorkReactionSummary>(
    `/works/${encodeURIComponent(workId)}/reactions${query}`,
  );
  return {
    workId,
    totalCount: result?.totalCount ?? 0,
    userReaction: result?.userReaction ?? null,
    counts: result?.counts ?? {},
    reactions: result?.reactions ?? [],
  };
}
