# Solar Installation Management System

Manage solar installation projects and operations

🛠 Manual Setup Required

# AI AGENTS! ATTENTION

1. The Backend ./backend folder is a separate git remote url. it is run
   on a separate host service. Meaning, it is not run via localhost. Do
   not try to run `npm install` on this folder.

# Mobile app

cd "/Users/miklos/Documents/Repos/solar installation management system"
npm install
cd ios && pod install && cd ..

# Backend

cd "/Users/miklos/Documents/Repos/solar installation management system/backend"
npm install
npx prisma generate
npx prisma migrate dev --name add_device_tokens 8. Rebuild the App

# iOS

cd ios && pod install && cd ..
npx react-native run-ios

# Android

npx react-native run-android

Required GitHub Secrets
Secret Purpose
FASTLANE_USER Apple ID
FASTLANE_PASSWORD App-specific password
FASTLANE_SESSION Session cookie (optional, prevents 2FA)
FASTLANE_TEAM_ID Developer Portal team
FASTLANE_ITC_TEAM_ID App Store Connect team
MATCH_PASSWORD Match repo encryption passphrase
MATCH_GIT_URL Git repo for certs/profiles
APP_STORE_CONNECT_API_KEY_ID ASC API key ID
APP_STORE_CONNECT_API_ISSUER_ID ASC API issuer ID
APP_STORE_CONNECT_API_KEY_BASE64 Base64-encoded .p8 key file

---

# Provisioning / changing the bundle ID

Fastlane `match` stores one encrypted profile **per bundle ID**. When the bundle
ID changes, the old profile in the match repo no longer matches and read-only CI
builds fail with `No matching provisioning profiles found`.

To (re)generate the App Store profile for the current bundle ID
(`com.solarimsys`), run match once in **writable** mode. Either locally:

```bash
cd ios
export MATCH_GIT_URL=<match repo https url>
export MATCH_PASSWORD=<match repo passphrase>
export FASTLANE_USER=<apple id>
export FASTLANE_PASSWORD=<app-specific password>
export FASTLANE_SESSION=<session cookie, avoids 2FA>
export FASTLANE_TEAM_ID=<team id>
bundle exec fastlane sync_signing      # is_ci=false locally -> writable
```

Or from CI: **Actions → "iOS CI/CD" → Run workflow**, which runs the `provision`
job (`bundle exec fastlane provision`) with `readonly: false`, guarded by the
`MATCH_WRITABLE=1` env var.

The `provision` lane authenticates to the Apple **Developer Portal** via the
**App Store Connect API key** (the same `.p8` CI already writes to
`~/.fastlane/api_key.p8`), so no Apple ID password or 2FA session is needed.
Make sure the API key has the **"Certificates, Identifiers & Profiles"**
capability (Admin role in App Store Connect → Users and Access → Keys) and that
the `APP_STORE_CONNECT_API_KEY_ID`, `APP_STORE_CONNECT_API_ISSUER_ID`, and
`APP_STORE_CONNECT_API_KEY_BASE64` secrets are set.

If you run `provision` **locally** without the API key configured, match falls
back to Apple ID + password. The Developer Portal requires the **account
password** and a valid `FASTLANE_SESSION` (generate one with
`fastlane spaceauth -u <apple_id>`); an app-specific password will be rejected
with _"login credentials seem to be wrong."_

> **Note:** `match` registers the Developer Portal App ID automatically, but it
> does **not** create the App Store Connect app record. If you changed the
> bundle ID, also create the matching app in App Store Connect before uploading
> to TestFlight.

## FOR APP REVIEW

password: SecurePassword1234!
email: appreview.solarimsys@gmail.com

password: SecurePassword1234!
email: demo@solarimsys.online
