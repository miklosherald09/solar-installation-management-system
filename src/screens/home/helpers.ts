/** Shared helpers for the HomeScreen */

import { Work } from '../../types';

/**
 * Filter works based on a search query.
 * Matches against title, description, location, and tags.
 */
export function filterWorks(works: Work[], query: string): Work[] {
  if (!query.trim()) return works;

  const q = query.toLowerCase();
  return works.filter(
    w =>
      w.title?.toLowerCase().includes(q) ||
      w.description?.toLowerCase().includes(q) ||
      w.location?.toLowerCase().includes(q) ||
      w.tags?.some(t => t.toLowerCase().includes(q)),
  );
}

/**
 * Ensure even number of items for a 2-column grid
 * by appending a placeholder if odd.
 */
export function padForTwoColumns(
  works: Work[],
): (Work & { _isPlaceholder?: boolean })[] {
  if (works.length % 2 !== 0) {
    return [
      ...works,
      { id: '__placeholder__', _isPlaceholder: true } as Work & {
        _isPlaceholder?: boolean;
      },
    ];
  }
  return works;
}

/**
 * Ensure a full last row in a grid by appending placeholders so the
 * number of items is a multiple of `columns`.
 */
export function padForColumns(
  works: Work[],
  columns: number,
): (Work & { _isPlaceholder?: boolean })[] {
  if (columns <= 1 || works.length === 0) return works;

  const remainder = works.length % columns;
  if (remainder === 0) return works;

  const placeholders = Array.from({ length: columns - remainder }, () => ({
    id: '__placeholder__',
    _isPlaceholder: true,
  })) as (Work & { _isPlaceholder?: boolean })[];

  return [...works, ...placeholders];
}
