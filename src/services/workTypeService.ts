/**
 * Work Type Service
 * Data layer for work types (categories) via the backend NestJS API.
 * The database is the source of truth for work types and their images.
 */

import type { WorkType } from '../types';
import { api } from './api';

/** Raw work type row returned by the backend API (Prisma model, camelCase) */
interface ApiWorkType {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  image: string;
icon: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapApiWorkTypeToWorkType(j: ApiWorkType): WorkType {
  return {
    id: j.id,
    name: j.name,
    slug: j.slug,
    description: j.description ?? '',
    color: j.color,
    image: j.image,
    icon: j.icon ?? 'build',
    sortOrder: j.sortOrder,
    isActive: j.isActive,
    createdAt: j.createdAt,
    updatedAt: j.updatedAt,
  };
}

/**
 * Fetch all active work types, ordered by sort order.
 */
export async function fetchWorkTypes(): Promise<WorkType[]> {
  const data = await api.get<ApiWorkType[]>('/work-types?active=true');
  return data.map(mapApiWorkTypeToWorkType);
}
