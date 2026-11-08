/**
 * Review Service
 * Data layer for submitting and fetching reviews / credibility stats.
 */

import { api } from './api';

export interface CredibilityStats {
  avgRating: number;
  reviewCount: number;
  completedWorks: number;
}

export interface ReviewData {
  id: string;
  workId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: {
    id: string;
    name: string;
    photo: string | null;
  };
  work?: {
    id: string;
    category: string;
    description: string;
  } | null;
}

export interface ReviewsResponse {
  reviews: ReviewData[];
  total: number;
}

export interface CreateReviewInput {
  workId: string;
  revieweeId: string;
  rating: number;
  comment?: string;
}

/**
 * Submit a review/rating for another user after work completion.
 */
export async function createReview(
  input: CreateReviewInput,
): Promise<ReviewData> {
  return api.post<ReviewData>('/reviews', input);
}

/**
 * Check if the current user has already reviewed a target user for a work.
 */
export async function hasReviewed(
  workId: string,
  revieweeId: string,
): Promise<boolean> {
  return api.get<boolean>(
    `/reviews/check?workId=${encodeURIComponent(workId)}&revieweeId=${encodeURIComponent(revieweeId)}`,
  );
}

/**
 * Get paginated reviews for a user.
 */
export async function getUserReviews(
  userId: string,
  skip = 0,
  take = 20,
): Promise<ReviewsResponse> {
  return api.get<ReviewsResponse>(
    `/users/${encodeURIComponent(userId)}/reviews?skip=${skip}&take=${take}`,
  );
}

/**
 * Get credibility stats for a user (avg rating, review count, completed works).
 */
export async function getUserCredibility(
  userId: string,
): Promise<CredibilityStats> {
  return api.get<CredibilityStats>(
    `/users/${encodeURIComponent(userId)}/credibility`,
  );
}