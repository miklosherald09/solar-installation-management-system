#!/usr/bin/env node
/**
 * bump-ios-version.js
 *
 * Bumps the iOS marketing version (CFBundleShortVersionString / MARKETING_VERSION)
 * in ios/solarimsys.xcodeproj/project.pbxproj. The Fastlane release/beta lanes
 * already auto-increment the build number (CURRENT_PROJECT_VERSION) via
 * latest_testflight_build_number, so this script only touches MARKETING_VERSION.
 *
 * Usage:
 *   npm run bump:ios             # patch bump  (1.0    -> 1.0.1)
 *   npm run bump:ios -- minor    # minor bump  (1.0    -> 1.1)
 *   npm run bump:ios -- major    # major bump  (1.0    -> 2.0)
 *   npm run bump:ios -- 1.2.3    # explicit version
 *
 * Exit codes:
 *   0  success
 *   1  invalid usage / version not found / file missing
 */

'use strict';

const fs = require('fs');
const path = require('path');

const PROJ_REL = path.join('ios', 'solarimsys.xcodeproj', 'project.pbxproj');
const PROJ_PATH = path.resolve(__dirname, '..', PROJ_REL);

const MARKETING_RE = /(MARKETING_VERSION\s*=\s*)(\d+(?:\.\d+){0,2})(\s*;)/g;

// ---------------------------------------------------------------------------
// Version helpers
// ---------------------------------------------------------------------------

/** Parse "1", "1.0", "1.0.1" into [major, minor, patch]. Returns null if invalid. */
function parseVersion(raw) {
  const m = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(String(raw).trim());
  if (!m) return null;
  return [Number(m[1]), Number(m[2] || 0), Number(m[3] || 0)];
}

/** Format [major, minor, patch] as "X.Y" (patch 0) or "X.Y.Z" (patch > 0). */
function formatVersion([major, minor, patch]) {
  return patch > 0 ? `${major}.${minor}.${patch}` : `${major}.${minor}`;
}

/** Compute the bumped version. Returns null if `mode` is unrecognized. */
function bump(current, mode) {
  const v = parseVersion(current);
  if (!v) return null;
  switch (mode) {
    case 'patch':
      return formatVersion([v[0], v[1], v[2] + 1]);
    case 'minor':
      return formatVersion([v[0], v[1] + 1, 0]);
    case 'major':
      return formatVersion([v[0] + 1, 0, 0]);
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  if (args.includes('-h') || args.includes('--help')) {
    console.log(`Usage:
  npm run bump:ios             # patch bump  (1.0 -> 1.0.1)
  npm run bump:ios -- minor    # minor bump  (1.0 -> 1.1)
  npm run bump:ios -- major    # major bump  (1.0 -> 2.0)
  npm run bump:ios -- 1.2.3    # explicit version
`);
    return 0;
  }

  const mode = args[0] || 'patch';

  if (!fs.existsSync(PROJ_PATH)) {
    console.error(`✖ project.pbxproj not found at ${PROJ_PATH}`);
    return 1;
  }

  const text = fs.readFileSync(PROJ_PATH, 'utf8');
  const matches = [...text.matchAll(MARKETING_RE)];
  if (matches.length === 0) {
    console.error(`✖ No MARKETING_VERSION found in ${PROJ_PATH}`);
    return 1;
  }

  // Current version = first occurrence (configs should be in sync).
  const current = matches[0][2];

  let next;
  if (mode === 'patch' || mode === 'minor' || mode === 'major') {
    next = bump(current, mode);
    if (!next) {
      console.error(`✖ Could not ${mode}-bump current version "${current}".`);
      return 1;
    }
  } else {
    // Explicit version, e.g. "1.2.3"
    next = parseVersion(mode) ? mode.trim() : null;
    if (!next) {
      console.error(
        `✖ Invalid version "${mode}". Use "patch" | "minor" | "major" | "X.Y[.Z]".`,
      );
      return 1;
    }
  }

  // Guard: Apple requires the new version to be HIGHER than the previously
  // approved one. Refuse to lower or keep the same version.
  const curParts = parseVersion(current);
  const nextParts = parseVersion(next);
  const isHigher =
    nextParts[0] > curParts[0] ||
    (nextParts[0] === curParts[0] && nextParts[1] > curParts[1]) ||
    (nextParts[0] === curParts[0] &&
      nextParts[1] === curParts[1] &&
      nextParts[2] > curParts[2]);
  if (!isHigher) {
    console.error(
      `✖ Refusing to write version "${next}": it is not higher than the current "${current}".`,
    );
    return 1;
  }

  const updated = text.replace(
    MARKETING_RE,
    (_match, prefix, _version, suffix) => `${prefix}${next}${suffix}`,
  );

  fs.writeFileSync(PROJ_PATH, updated);
  console.log('✓', PROJ_REL);
  console.log(`  MARKETING_VERSION: ${current} -> ${next}`);
  console.log(
    `  (updated ${matches.length} config${matches.length > 1 ? 's' : ''} — Debug/Release)`,
  );
  console.log('');
  console.log('Next steps:');
  console.log('  1. Commit the change and push.');
  console.log(
    '  2. Re-run the iOS release lane (it auto-increments the build number).',
  );
  return 0;
}

process.exit(main());
