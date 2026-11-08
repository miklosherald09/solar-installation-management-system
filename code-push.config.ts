/**
 * CodePush CLI configuration — MinIO storage backend.
 *
 * Implements `CliConfigInterface` from @bravemobile/react-native-code-push.
 * Consumed by: npx code-push create-history | release | update-history | show-history
 *
 * Bundles and release history are stored in the MinIO bucket `solarimsys`
 * under the `codepush/` prefix. The bucket allows public reads so the mobile
 * app can fetch history and bundles directly.
 *
 * MinIO server: http://10.1.1.103:9000  (bucket: solarimsys)
 *
 * Bucket layout:
 *   codepush/histories/{platform}/{identifier}/{binaryVersion}.json   ← release history
 *   codepush/bundles/{platform}/{identifier}/{bundleHash}             ← JS bundle
 *
 * Configuration via environment variables (all optional):
 *   MINIO_ENDPOINT          MinIO host        (default 10.1.1.103)
 *   MINIO_PORT              MinIO port        (default 9000)
 *   MINIO_USE_SSL           'true' for TLS    (default false)
 *   MINIO_ACCESS_KEY        access key        (default minioadmin)
 *   MINIO_SECRET_KEY        secret key        (default minioadmin)
 *   MINIO_BUCKET            bucket name       (default solarimsys)
 *   CODEPUSH_CDN_BASE_URL   public read base  (default http://10.1.1.103:9000/solarimsys)
 *
 * NOTE: This file uses `module.exports` instead of `export default` because
 * the CLI loads it via `require()` through `ts-node/register` and reads the
 * exported object directly — it does NOT unwrap `export default`.
 */

const path = require('node:path');
const Minio = require('minio');

const BUCKET = process.env.MINIO_BUCKET || 'solarimsys';
const CDN_BASE_URL =
  process.env.CODEPUSH_CDN_BASE_URL ||
  `http://${process.env.MINIO_ENDPOINT || '10.1.1.103'}:${process.env.MINIO_PORT || '9000'}/${BUCKET}`;
const CODEPUSH_PREFIX = 'codepush';

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || '10.1.1.103',
  port: Number(process.env.MINIO_PORT || 9000),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

function historyKey(
  platform: 'ios' | 'android',
  identifier: string | undefined,
  binaryVersion: string,
): string {
  const id = identifier || 'staging';
  return `${CODEPUSH_PREFIX}/histories/${platform}/${id}/${binaryVersion}.json`;
}

function bundleKey(
  platform: 'ios' | 'android',
  identifier: string | undefined,
  fileName: string,
): string {
  const id = identifier || 'staging';
  return `${CODEPUSH_PREFIX}/bundles/${platform}/${id}/${fileName}`;
}

function publicUrl(objectKey: string): string {
  return `${CDN_BASE_URL}/${objectKey}`;
}

const config: import('@bravemobile/react-native-code-push').CliConfigInterface =
  {
    /**
     * Upload a CodePush bundle file to MinIO and return its public URL.
     */
    bundleUploader: async (source, platform, identifier) => {
      const fileName = path.basename(source);
      const key = bundleKey(platform, identifier, fileName);
      await minioClient.fPutObject(BUCKET, key, source, {
        'Content-Type': 'application/octet-stream',
      });
      const downloadUrl = publicUrl(key);
      console.log('Bundle uploaded:', downloadUrl);
      return { downloadUrl };
    },

    /**
     * Fetch the release history JSON for a binary version from MinIO.
     *
     * - 404  → returns `{}` (no history published yet for this binary version)
     * - any other non-2xx or network error → THROWS, so the `release` command
     *   aborts instead of overwriting an existing history that simply failed
     *   to load (which would cause data loss).
     *
     * This is intentionally stricter than the runtime `releaseHistoryFetcher`
     * (src/services/codePushService.ts), which always returns `{}` because an
     * OTA check must never block app startup.
     */
    getReleaseHistory: async (targetBinaryVersion, platform, identifier) => {
      const key = historyKey(platform, identifier, targetBinaryVersion);
      const url = publicUrl(key);
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
      });

      if (res.status === 404) {
        return {};
      }
      if (!res.ok) {
        throw new Error(
          `Failed to fetch release history (${res.status} ${res.statusText}) from ${url}`,
        );
      }

      const data = await res.json();
      return (
        (data as import('@bravemobile/react-native-code-push').ReleaseHistoryInterface) ||
        {}
      );
    },

    /**
     * Upload the release-history JSON file to MinIO.
     */
    setReleaseHistory: async (
      targetBinaryVersion,
      jsonFilePath,
      _releaseInfo,
      platform,
      identifier,
    ) => {
      const key = historyKey(platform, identifier, targetBinaryVersion);
      await minioClient.fPutObject(BUCKET, key, jsonFilePath, {
        'Content-Type': 'application/json',
      });
      console.log('Release history uploaded:', publicUrl(key));
    },
  };

module.exports = config;
