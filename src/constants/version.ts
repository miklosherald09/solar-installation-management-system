/**
 * Version
 * Reads the app version from package.json (single source of truth).
 *
 * Usage:
 *   import { APP_VERSION, APP_BUILD } from '../constants/version';
 *   // APP_VERSION = "1.0.0"
 *   // APP_BUILD   = "1.0.0 (1)"  — version + android versionCode, useful for debug
 */

import { name, version } from '../../package.json';
import { displayName } from '../../app.json';

/** Semantic version from package.json  (e.g. "1.0.0") */
export const APP_VERSION: string = version;

/** App display name */
export const APP_NAME: string = displayName || name;

/**
 * Human-readable build string.
 * On Android you can optionally append the native versionCode; the native
 * module `react-native-device-info` is the canonical way, but for zero-dependency
 * we export just the semver and let the consumer decide.
 */
export const APP_BUILD: string = version;

/**
 * Formatted version string for display in app footers / settings.
 * Example: "Solar Installation Management System v1.0.0"
 */
export function getAppVersionString(): string {
  return `${APP_NAME} v${version}`;
}

/**
 * Human-readable build environment label for footers / settings.
 * Based on React Native's built-in `__DEV__` global:
 *  - development when running in a dev/emulator build
 *  - production for release builds
 */
export function getBuildEnvironmentLabel(): string {
  return __DEV__ ? 'development' : 'production';
}
