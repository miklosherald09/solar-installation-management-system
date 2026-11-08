/**
 * Categories Constants & Helpers
 * Default category mappings and resolvers.
 */

import { CategoryInfo, WorkCategory, WorkType } from '../types';

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'cleaning',
    label: 'Cleaning',
    icon: 'cleaning-services',
    color: '#A8A8B7',
  },
  { id: 'gardening', label: 'Gardening', icon: 'grass', color: '#A8A8B7' },
  { id: 'pet_sitting', label: 'Pet Sitting', icon: 'pets', color: '#A8A8B7' },
  {
    id: 'car_wash',
    label: 'Car Wash',
    icon: 'local-car-wash',
    color: '#A8A8B7',
  },
  { id: 'repair', label: 'Repair', icon: 'build', color: '#A8A8B7' },
  { id: 'moving', label: 'Moving', icon: 'local-shipping', color: '#A8A8B7' },
  { id: 'painting', label: 'Painting', icon: 'format-paint', color: '#A8A8B7' },
  {
    id: 'construction',
    label: 'Construction',
    icon: 'construction',
    color: '#A8A8B7',
  },
  {
    id: 'electrical',
    label: 'Electrical',
    icon: 'electrical-services',
    color: '#A8A8B7',
  },
  { id: 'driver', label: 'Driver', icon: 'directions-car', color: '#A8A8B7' },
  { id: 'other', label: 'Other', icon: 'auto-awesome', color: '#A8A8B7' },
];

export const getCategoryInfo = (
  category: WorkCategory | string,
): CategoryInfo => {
  const primary =
    typeof category === 'string' ? category.split(',')[0].trim() : category;
  return CATEGORIES.find(c => c.id === primary) || CATEGORIES[9];
};

/**
 * DB-aware category info resolver.
 *
 * Prefers the live work-type metadata fetched from the backend (which carries
 * the DB-driven `icon`, `color`, and `name`) so newly-added work types render
 * correctly with NO frontend rebuild/upload. Falls back to the static CATEGORIES
 * defaults only when the backend row isn't available yet (e.g. API still loading/cached
 * misses) or for render-registered legacy categories.
 */
export const workTypeToCategoryInfo = (
  workType: WorkType | undefined,
  fallback: CategoryInfo,
): CategoryInfo =>
  workType
    ? {
        id: workType.slug as WorkCategory,
        label: workType.name,
        icon: workType.icon || fallback.icon,
        color: workType.color || fallback.color,
      }
    : fallback;
