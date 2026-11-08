/**
 * API Client
 * Thin wrapper around fetch for calling the backend NestJS API.
 */

import { API_BASE_URL } from '../constants';
import { getAccessToken, refreshAccessToken } from './authTokens';

/**
 * Error thrown by the API client. In addition to the message it also carries
 * the HTTP status code so callers can distinguish outcomes such as 404
 * (not found) from 410 (gone / soft-deleted).
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  if (url.startsWith('http://')) {
    throw new ApiError(
      'Insecure cleartext HTTP requests are disabled. HTTPS is required.',
      400,
    );
  }

  const accessToken = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // The access token expired (or was rejected).  Refresh once, then retry the
  // original request.  Only applies when a token was actually attached — public
  // endpoints (login, refresh, …) returning 401 must surface their own error.
  if (response.status === 401 && retry && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request<T>(endpoint, options, false);
    }
  }

  if (!response.ok) {
    const errorBody = await response.text();
    let message: string;
    try {
      const parsed = JSON.parse(errorBody);
      message =
        parsed.message || `Request failed with status ${response.status}`;
    } catch {
      message = `Request failed with status ${response.status}`;
    }
    throw new ApiError(message, response.status);
  }

  // Some endpoints return no body (e.g. NestJS handlers returning void respond
  // with 201/204 and an empty body). Calling response.json() on an empty body
  // throws "JSON Parse error: Unexpected end of input", so parse the text
  // manually and treat an empty body as undefined.
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),

  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  patch: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
