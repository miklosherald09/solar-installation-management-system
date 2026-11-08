import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * cn
 * Merge Tailwind/NativeWind class names concisely.
 * `clsx` handles conditional values and `tailwind-merge` resolves
 * conflicting Tailwind classes (e.g. `p-2 p-4` keeps only `p-4`).
 *
 * @example
 * cn('px-4', isActive && 'bg-blue-500', 'bg-red-500') // => 'px-4 bg-red-500'
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
