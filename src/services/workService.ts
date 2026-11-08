/**
 * Work Service
 * Data layer for work CRUD operations via the backend NestJS API.
 */

import type { Work, WorkCategory, WorkStatus, User } from '../types';
import { api } from './api';

// ─── Backend API types ───────────────────────────────────────

/** User nested in work responses (from Prisma include) */
interface ApiPostedByUser {
  id: string;
  name: string;
  email: string;
  photo: string | null;
  verifiedAt?: string | null;
  credibility?: {
    avgRating: number;
    reviewCount: number;
    completedWorks: number;
  } | null;
}

/** Raw work row returned by the backend API (Prisma model, camelCase serialization) */
interface ApiWork {
  id: string;
  title: string | null;
  description: string;
  category: string;
  conciseLocation?: string;
  budget: number;
  budgetType: string;
  currency: string | null;
  location: string;
  latitude: number | null;
  longitude: number | null;
  distance: string | null;
  contactPhone: string | null;
  phoneCountryCode?: string | null;
  postedBy: string;
  postedByUser?: ApiPostedByUser;
  acceptedUserIds?: string[];
  status: string;
  applicants: number;
  images: string[];
  createdAt: string;
  updatedAt: string;
  scheduledDate: string | null;
  durationValue: number | null;
  durationUnit: string | null;
  tags: string[];
}

/** Payload for creating a work via the API */
interface CreateWorkPayload {
  title?: string;
  description: string;
  category: string;
  categories?: string[];
  budget: number;
  budgetType: string;
  currency?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  distance?: string;
  contactPhone?: string;
  phoneCountryCode?: string;
  postedBy: string;
  status?: string;
  images?: string[];
  scheduledDate?: string;
  durationValue?: number;
  durationUnit?: string;
  tags?: string[];
}

/** Editable subset of a work that can be sent to PATCH /works/:id */
export interface UpdateWorkData {
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  distance?: string;
  description?: string;
  budget?: number;
  budgetType?: string;
  currency?: string;
  category?: string;
  durationValue?: number | null;
  durationUnit?: string | null;
  images?: string[];
  tags?: string[];
  contactPhone?: string | null;
  phoneCountryCode?: string | null;
  acceptedUserIds?: string[];
}

// ─── Helpers ──────────────────────────────────────────────────

function generateTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Map an API work row to the app Work type.
 */
function mapApiWorkToWork(api: ApiWork): Work {
  const postedByUser = api.postedByUser;
  const credibility = postedByUser?.credibility;
  const postedBy: User = {
    id: api.postedBy,
    name: postedByUser?.name || 'Unknown',
    email: postedByUser?.email ?? undefined,
    photo:
      postedByUser?.photo ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
        postedByUser?.name || 'Unknown',
      )}`,
    rating: credibility?.avgRating ?? 0,
    reviewCount: credibility?.reviewCount ?? 0,
    completedWorks: credibility?.completedWorks ?? 0,
    memberSince: '',
    verifiedAt: postedByUser?.verifiedAt ?? null,
  };

  return {
    id: api.id,
    title: api.title ?? undefined,
    description: api.description,
    category: api.category as WorkCategory,
    budget: api.budget,
    budgetType: api.budgetType as Work['budgetType'],
    currency: api.currency ?? undefined,
    location: api.location,
    conciseLocation: api.conciseLocation,
    latitude: api.latitude ?? undefined,
    longitude: api.longitude ?? undefined,
    distance: api.distance ?? undefined,
    contactPhone: api.contactPhone ?? undefined,
    phoneCountryCode: api.phoneCountryCode ?? undefined,
    postedBy,
    acceptedUserIds: api.acceptedUserIds || [],
    status: api.status as WorkStatus,
    applicants: api.applicants,
    images: api.images?.length ? api.images : undefined,
    createdAt: api.createdAt,
    scheduledDate: api.scheduledDate ?? undefined,
    durationValue: api.durationValue ?? undefined,
    durationUnit: (api.durationUnit as Work['durationUnit']) ?? undefined,
    tags: api.tags?.length ? api.tags : undefined,
  };
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Fetch works ordered by most recent first. Optionally filter by a near-me
 * location (server-side distance filter) so the client does no distance math.
 */
export async function fetchWorks(filters?: {
  latitude?: number;
  longitude?: number;
  rangeKm?: number;
}): Promise<Work[]> {
  const params: string[] = [];
  if (filters?.latitude != null) {
    params.push(`latitude=${filters.latitude}`);
  }
  if (filters?.longitude != null) {
    params.push(`longitude=${filters.longitude}`);
  }
  if (filters?.rangeKm != null) {
    params.push(`rangeKm=${filters.rangeKm}`);
  }
  const qs = params.length ? `?${params.join('&')}` : '';
  const works = await api.get<ApiWork[]>(`/works${qs}`);
  return works.map(mapApiWorkToWork);
}

/**
 * Fetch only works posted by a specific user ID.
 */
export async function fetchWorksByUserId(userId: string): Promise<Work[]> {
  const works = await api.get<ApiWork[]>(
    `/works?postedBy=${encodeURIComponent(userId)}`,
  );
  return works.map(mapApiWorkToWork);
}

/**
 * Fetch completed works associated with a user (as accepted worker or completed poster).
 */
export async function fetchCompletedWorksByUserId(
  userId: string,
): Promise<Work[]> {
  const works = await api.get<ApiWork[]>(
    `/works?completedBy=${encodeURIComponent(userId)}`,
  );
  return works.map(mapApiWorkToWork);
}

/**
 * Result of fetchWorkById — distinguishes three distinct outcomes so the UI can
 * reflect the real database state:
 *  - 'found':    the work exists and is returned.
 *  - 'removed':  the work row exists but has been soft-deleted (deletedAt set).
 *  - 'notFound': there is no such work in the database at all.
 */
export type WorkDetailResult =
  | { status: 'found'; work: Work }
  | { status: 'removed' }
  | { status: 'notFound' };

/**
 * Fetch a single work by ID.
 * Returns a distinct result for a work that truly does not exist versus one that
 * was soft-deleted in the database (HTTP 410 Gone returned by the backend).
 */
export async function fetchWorkById(id: string): Promise<WorkDetailResult> {
  try {
    const work = await api.get<ApiWork>(`/works/${id}`);
    return { status: 'found', work: mapApiWorkToWork(work) };
  } catch (err: any) {
    // 410 Gone — the row exists but was soft-deleted (deletedAt set in DB).
    if (err?.status === 410) {
      return { status: 'removed' };
    }
    // 404 Not Found — no such work in the database.
    if (err?.status === 404) {
      return { status: 'notFound' };
    }
    // Fallback for error shapes that do not carry a status code.
    if (err?.message?.includes('not found')) {
      return { status: 'notFound' };
    }
    throw err;
  }
}

/**
 * Create a new work via the backend API.
 */
export async function createWork(
  workData: Omit<Work, 'id' | 'createdAt' | 'applicants' | 'postedBy'> & {
    postedBy?: string;
  },
): Promise<Work> {
  const payload: CreateWorkPayload = {
    description: workData.description,
    category: workData.category,
    categories:
      (workData.categories as string[]) ||
      (workData.category
        ? workData.category.split(',').map(s => s.trim())
        : undefined),
    budget: workData.budget,
    budgetType: workData.budgetType,
    currency: workData.currency,
    location: workData.location,
    latitude: workData.latitude,
    longitude: workData.longitude,
    distance: workData.distance,
    contactPhone: workData.contactPhone,
    phoneCountryCode: workData.phoneCountryCode,
    postedBy: workData.postedBy || generateTempId(),
    status: workData.status || 'open',
    images: workData.images,
    scheduledDate: workData.scheduledDate,
    durationValue: workData.durationValue,
    durationUnit: workData.durationUnit,
    tags: workData.tags,
  };

  const created = await api.post<ApiWork>('/works', payload);
  return mapApiWorkToWork(created);
}

/**
 * Permanently delete a work by ID via the backend API.
 */
export async function deleteWork(id: string): Promise<void> {
  await api.delete<void>(`/works/${id}`);
}

/**
 * Update an existing work's location via the backend API.
 * Sends a PATCH and returns the refreshed work.
 */
export async function updateWork(
  id: string,
  data: UpdateWorkData,
): Promise<Work> {
  const updated = await api.patch<ApiWork>(`/works/${id}`, data);
  return mapApiWorkToWork(updated);
}

/**
 * Mark a work as completed via the backend API.
 * Sends a PATCH and returns the refreshed work.
 */
export async function completeWork(id: string): Promise<Work> {
  const updated = await api.patch<ApiWork>(`/works/${id}`, {
    status: 'completed',
  });
  return mapApiWorkToWork(updated);
}

/**
 * Accept a candidate for a work.
 * Sends a PATCH to set acceptedUserId and status to in_progress.
 */
export async function acceptApplicant(
  workId: string,
  userId: string,
  currentAcceptedIds: string[],
): Promise<Work> {
  const updated = await api.patch<ApiWork>(`/works/${workId}`, {
    acceptedUserIds: [...currentAcceptedIds, userId],
    status: 'in_progress',
  });
  return mapApiWorkToWork(updated);
}

export interface WorkHistory {
  id: string;
  workId: string;
  changedField: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

/**
 * Fetch the change history logs for a work.
 */
export async function fetchWorkHistory(workId: string): Promise<WorkHistory[]> {
  return api.get<WorkHistory[]>(`/works/${workId}/history`);
}
