/**
 * Comment Service
 * Data layer for public work comments via the backend NestJS API.
 * Endpoints: /works/:workId/comments
 */

import { api } from './api';
import type { WorkComment } from '../types';

// ─── API shapes ───────────────────────────────────────────────

interface ApiComment {
  id: string;
  workId: string;
  authorId: string;
  authorName: string;
  authorPhoto: string | null;
  text: string;
  likeCount: number;
  likedByMe: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapApiComment(c: ApiComment): WorkComment {
  return {
    id: c.id,
    workId: c.workId,
    authorId: c.authorId,
    authorName: c.authorName,
    authorPhoto: c.authorPhoto,
    text: c.text,
    likeCount: c.likeCount ?? 0,
    likedByMe: c.likedByMe ?? false,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Fetch all comments for a work, newest first.
 */
export async function fetchComments(workId: string): Promise<WorkComment[]> {
  const items = await api.get<ApiComment[]>(
    `/works/${encodeURIComponent(workId)}/comments`,
  );
  return items.map(mapApiComment);
}

/**
 * Post a new comment on a work.
 */
export async function createComment(
  workId: string,
  text: string,
): Promise<WorkComment> {
  const item = await api.post<ApiComment>(
    `/works/${encodeURIComponent(workId)}/comments`,
    { text },
  );
  return mapApiComment(item);
}

/**
 * Delete one of your own comments.
 */
export async function deleteComment(
  workId: string,
  commentId: string,
): Promise<void> {
  await api.delete<void>(
    `/works/${encodeURIComponent(workId)}/comments/${encodeURIComponent(
      commentId,
    )}`,
  );
}

/**
 * Like a comment.
 */
export async function likeComment(
  workId: string,
  commentId: string,
): Promise<void> {
  await api.post<void>(
    `/works/${encodeURIComponent(workId)}/comments/${encodeURIComponent(
      commentId,
    )}/like`,
    {},
  );
}

/**
 * Unlike a comment.
 */
export async function unlikeComment(
  workId: string,
  commentId: string,
): Promise<void> {
  await api.delete<void>(
    `/works/${encodeURIComponent(workId)}/comments/${encodeURIComponent(
      commentId,
    )}/like`,
  );
}
