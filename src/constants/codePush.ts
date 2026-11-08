/**
 * CodePush (OTA update) configuration for the runtime (React Native) side.
 *
 * Bundles and release-history JSON are served as static files from the bucket
 * under the `codepush/` prefix. The bucket allows public reads so the app
 * can fetch history and bundles directly over HTTP.
 *
 * All URLs come from the central environment config: src/constants/env.ts
 *
 * Bucket layout (mirrors the structure in code-push.config.ts):
 *   codepush/histories/{platform}/{identifier}/{binaryVersion}.json   ← release history
 *   codepush/bundles/{platform}/{identifier}/{bundleHash}             ← JS bundle
 *
 * At app start the CodePush HOC calls `releaseHistoryFetcher` (see
 * src/services/codePushService.ts) which GETs the history JSON for the
 * running native binary version + channel. If a newer release exists, the
 * runtime downloads the bundle referenced by its `downloadUrl`.
 */

import {
  CODEPUSH_CDN_BASE_URL,
  CODEPUSH_PREFIX,
  CODEPUSH_IDENTIFIER,
} from './env';

export { CODEPUSH_CDN_BASE_URL, CODEPUSH_PREFIX, CODEPUSH_IDENTIFIER };

/**
 * Build the public URL of a release-history JSON file.
 *
 * @param platform       'ios' | 'android'
 * @param identifier     channel, e.g. 'staging' | 'production'
 * @param binaryVersion  native binary version (e.g. '0.0.5') — this is the
 *                       value the CodePush runtime reports as
 *                       `UpdateCheckRequest.app_version`, NOT the
 *                       package.json version.
 */
export function codePushHistoryUrl(
  platform: 'ios' | 'android',
  identifier: string,
  binaryVersion: string,
): string {
  return `${CODEPUSH_CDN_BASE_URL}/${CODEPUSH_PREFIX}/histories/${platform}/${identifier}/${binaryVersion}.json`;
}

/**
 * Build the public URL of an uploaded CodePush bundle.
 * Mirrors the path written by `bundleUploader` in code-push.config.ts.
 */
export function codePushBundleUrl(
  platform: 'ios' | 'android',
  identifier: string,
  bundleFileName: string,
): string {
  return `${CODEPUSH_CDN_BASE_URL}/${CODEPUSH_PREFIX}/bundles/${platform}/${identifier}/${bundleFileName}`;
}
