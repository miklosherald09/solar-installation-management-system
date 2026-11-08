/**
 * Prisma Client placeholder
 *
 * TODO: Replace with actual Prisma Client when ready.
 * npm install @prisma/client prisma
 * npx prisma init
 * npx prisma generate
 *
 * Example usage:
 *   import { PrismaClient } from '@prisma/client';
 *   const prisma = new PrismaClient();
 *   const works = await prisma.works.findMany();
 */

export {};

/**
 * Database table types matching the Work schema
 */
export interface WorkRow {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  budget_type: 'fixed' | 'hourly' | 'negotiable';
  location: string;
  distance?: string;
  posted_by: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  applicants: number;
  images?: string[];
  created_at: string;
  scheduled_date?: string;
  tags?: string[];
}

export interface UserRow {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  review_count: number;
  completed_works: number;
  member_since: string;
  bio?: string;
  location?: string;
  phone?: string;
  email?: string;
}
