const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');

const root = path.resolve(__dirname);
// Split into parts so the regex can accept both `C:\` and `C:/` forms.
const rootParts = root.split(/[\\/]+/);
const escapeSeg = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Regex that matches anything under <project root>/segment1/segment2...
// using either Windows (`\`) or POSIX (`/`) separators. Case-insensitive
// because Windows paths are case-insensitive (project root resolves to
// `C:\...` but file reads often come in as `c:\...`).
const blockDir = (...segs) =>
  new RegExp(
    `^${[...rootParts, ...segs].map(escapeSeg).join('(?:[\\\\/])')}(?:[\\\\/]|$)`,
    'i',
  );

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    unstable_enablePackageExports: true,
    // Do NOT crawl/watch folders that are not part of the app bundle:
    //  - backend/  is a separate NestJS deployable (own git remote, its own
    //    node_modules with Prisma/Cassandra deps) that Metro otherwise indexes
    //    and watches on every startup — huge file-map crawl slowdown.
    //  - build / generated dirs (Gradle, CMake .cxx, Xcode, .bundle) churn
    //    constantly and trigger useless re-scans.
    blockList: [
      blockDir('backend'),
      blockDir('logos'),
      blockDir('.git'),
      blockDir('.bundle'),
      blockDir('ios', 'build'),
      blockDir('android', 'build'),
      blockDir('android', 'app', 'build'),
      blockDir('android', 'app', '.cxx'),
    ],
  },
};

module.exports = withNativeWind(
  mergeConfig(getDefaultConfig(__dirname), config),
  { input: './global.css' },
);
