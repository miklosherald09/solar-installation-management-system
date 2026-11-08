/**
 * CodePush runtime service.
 *
 * Provides `releaseHistoryFetcher`, the function the CodePush HOC calls to
 * discover OTA updates from the MinIO bucket backend.
 * History JSON and bundles are served as static files from the bucket at
 * http://10.1.1.103:9000/solarimsys/.
 *
 * Failure policy: on ANY error (network, HTTP non-2xx, parse) the fetcher
 * resolves to `{}`. An empty release history means "no update available",
 * so the app keeps running the currently installed bundle. This guarantees
 * OTA failures never block app startup.
 */

import { Platform } from 'react-native';
import type {
  ReleaseHistoryInterface,
  UpdateCheckRequest,
} from '@bravemobile/react-native-code-push';
import { CODEPUSH_IDENTIFIER, codePushHistoryUrl } from '../constants/codePush';

/**
 * Fetch the release history for the currently running binary version.
 *
 * The CodePush runtime invokes this with an `UpdateCheckRequest` whose
 * `app_version` is the NATIVE binary version (iOS CFBundleShortVersionString
 * / Android versionName) — not the package.json version. Platform and
 * channel are not part of the request, so we derive the platform from
 * `Platform.OS` and the channel from the configured identifier.
 */
export async function releaseHistoryFetcher(
  updateRequest: UpdateCheckRequest,
): Promise<ReleaseHistoryInterface> {
  const binaryVersion = updateRequest.app_version;
  const platform: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';

  const url = codePushHistoryUrl(platform, CODEPUSH_IDENTIFIER, binaryVersion);

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      // 404 = no history published yet for this binary version, etc.
      return {};
    }

    const data = (await response.json()) as ReleaseHistoryInterface | null;
    return data ?? {};
  } catch {
    // Network/DNS/timeout/parse error — never throw; treat as "no update".
    return {};
  }
}
