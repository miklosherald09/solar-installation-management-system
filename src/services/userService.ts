/**
 * User Service
 * Data layer for user search and profile lookup.
 */

import { api } from './api';
import type { AuthUser } from '../store/useAuthStore';
import type { WorkAvailability } from '../types';

/** Minimal user shape used for search results and public profiles. */
export interface UserSummary {
  id: string;
  name: string;
  email: string;
  photo: string | null;
  phone?: string | null;
  phoneCountryCode?: string | null;
  nearMeLatitude?: number | null;
  nearMeLongitude?: number | null;
  nearMeLocation?: string | null;
  nearMeConciseLocation?: string | null;
  location?: string | null;
  conciseLocation?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distance?: string;
  capableWorkTypes?: string[];
  neededWorkType?: string[];
  role?: string;
  verifiedAt?: string | null;
  verifiedByUserId?: string | null;
  workAvailability?: WorkAvailability;
  /** Credibility data (from /users/:id/credibility or embedded) */
  credibility?: {
    avgRating: number;
    reviewCount: number;
    completedWorks: number;
  } | null;
}

/**
 * Search users by name or email via the backend.
 */
export async function searchUsers(query: string): Promise<UserSummary[]> {
  return api.get<UserSummary[]>(`/users?q=${encodeURIComponent(query)}`);
}

/**
 * Fetch a single user by ID.
 */
export async function fetchUserById(id: string): Promise<UserSummary> {
  return api.get<UserSummary>(`/users/${encodeURIComponent(id)}`);
}

/** Payload for the profile update endpoint (display name + profile photo). */
export interface UpdateProfileInput {
  name?: string;
  photo?: string;
  phone?: string | null;
  phoneCountryCode?: string | null;
  location?: string | null;
  conciseLocation?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Update the authenticated user's display name and/or profile photo.
 * Backend: PATCH /users/:id/profile
 */
export async function updateProfile(
  userId: string,
  data: UpdateProfileInput,
): Promise<AuthUser> {
  return api.patch<AuthUser>(
    `/users/${encodeURIComponent(userId)}/profile`,
    data,
  );
}

/**
 * Save a user's capable / willing work types (work-type slugs).
 * Backend: PATCH /users/:id/work-types
 */
export async function saveUserWorkTypes(
  userId: string,
  neededWorkType: string[],
): Promise<void> {
  await api.patch(`/users/${encodeURIComponent(userId)}/work-types`, {
    neededWorkType,
  });
}

/**
 * Save a user's capable / willing-to-perform work types (work-type slugs).
 * Backend: PATCH /users/:id/capable-work-types
 */
export async function saveCapableWorkTypes(
  userId: string,
  capableWorkTypes: string[],
): Promise<void> {
  await api.patch(`/users/${encodeURIComponent(userId)}/capable-work-types`, {
    capableWorkTypes,
  });
}

/**
 * Save a user's work availability status.
 * Backend: PATCH /users/:id/work-availability
 */
export async function updateUserWorkAvailability(
  userId: string,
  workAvailability: WorkAvailability,
): Promise<{ id: string; workAvailability: WorkAvailability }> {
  return api.patch(`/users/${encodeURIComponent(userId)}/work-availability`, {
    workAvailability,
  });
}

/** Block relationship between the authenticated user and another user. */
export interface BlockStatus {
  /** The authenticated user has blocked the target user. */
  blocked: boolean;
  /** The target user has blocked the authenticated user. */
  blockedBy: boolean;
}

/**
 * Fetch the block status between the authenticated user and another user.
 * Backend: GET /users/:id/block
 */
export async function fetchBlockStatus(userId: string): Promise<BlockStatus> {
  return api.get<BlockStatus>(`/users/${encodeURIComponent(userId)}/block`);
}

/**
 * Block a user. The authenticated user (from the JWT) blocks `userId`.
 * Backend: POST /users/:id/block
 */
export async function blockUser(userId: string): Promise<{ id: string }> {
  return api.post<{ id: string }>(
    `/users/${encodeURIComponent(userId)}/block`,
    {},
  );
}

/**
 * Unblock a user.
 * Backend: DELETE /users/:id/block
 */
export async function unblockUser(userId: string): Promise<void> {
  return api.delete<void>(`/users/${encodeURIComponent(userId)}/block`);
}

/**
 * Toggle the "Verified Pro" badge status for a user.
 * Only callable by users with Role.ADMIN.
 * Backend: POST /users/:id/toggle-pro-badge
 */
export async function toggleProBadge(userId: string): Promise<UserSummary> {
  return api.post<UserSummary>(
    `/users/${encodeURIComponent(userId)}/toggle-pro-badge`,
    {},
  );
}

