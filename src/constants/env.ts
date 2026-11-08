/**
 * Environment configuration — single source of truth for ALL URLs and keys.
 *
 * Dev vs production is determined by `__DEV__` (React Native's built-in global).
 *
 * To add .env file support later:
 *   1. Install react-native-config
 *   2. Create .env / .env.production files
 *   3. Replace each fallback value below with Config.VARIABLE_NAME
 *
 *   npm install react-native-config
 *
 * This approach requires zero dependencies and zero native changes today.
 */

// ---------------------------------------------------------------------------
// MinIO — object storage (images, CodePush bundles, release history)
// ---------------------------------------------------------------------------

export const MINIO = {
  endpoint: 'photos.solarimsys.online',
  port: '',
  useSSL: true,
  accessKey: 'minioadmin',
  secretKey: 'minioadmin',
  bucket: __DEV__ ? 'solarimsys-dev' : 'solarimsys',
} as const;

export const MINIO_BASE_URL = `https://${MINIO.endpoint}/${MINIO.bucket}`;

// ---------------------------------------------------------------------------
// Backend REST API
// ---------------------------------------------------------------------------

/** Base URL for the backend API (NestJS) */
export const API_BASE_URL_DEV = 'https://api.dev.solarimsys.online/api/v1';
export const API_BASE_URL_PROD = 'https://api.prod.solarimsys.online/api/v1';
export const API_BASE_URL_LOCAL = 'http://192.168.0.172:3000/api/v1';

export const API_BASE_URL = !__DEV__ ? API_BASE_URL_DEV : API_BASE_URL_PROD;
// export const API_BASE_URL = API_BASE_URL_LOCAL;

export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws').replace(
  /\/api\/v1$/,
  '',
);
export const WS_CALLS_URL = `${WS_BASE_URL}/ws/calls`;

// ---------------------------------------------------------------------------
// CodePush CDN (same MinIO bucket, `codepush/` prefix)
// ---------------------------------------------------------------------------

/** Public base URL for CodePush artifacts (history JSON + JS bundles) */
export const CODEPUSH_CDN_BASE_URL = MINIO_BASE_URL;

/** Prefix inside the MinIO bucket for CodePush objects */
export const CODEPUSH_PREFIX = 'codepush';

/**
 * Release channel identifier.
 * Dev builds query the `staging` channel; release builds query `production`.
 */
export const CODEPUSH_IDENTIFIER = __DEV__ ? 'staging' : 'production';

// ---------------------------------------------------------------------------
// Nominatim — free OpenStreetMap geocoding (no API key required)
// ---------------------------------------------------------------------------

/** Base URL of the Nominatim API. Usage policy: ~1 req/s. */
export const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
// export const NOMINATIM_BASE = 'https://nominatim.solarimsys.online';
