============================================================
CodePush Server ~@~T Credentials & URLs
Host: 10.1.1.120
Generated: 2026-08-10
============================================================

## SERVER URLs

API Server: http://10.1.1.120:3000
Download/CDN: http://10.1.1.120/download
Web Management: http://10.1.1.120

## ADMIN LOGIN

Email: lisong2010@gmail.com
Password: admin123

## CLI ACCESS KEY

767lQIb94OKpaiVQpT3vzw82MIRN4ksvOXqog

## DEPLOYMENT KEYS ~@~T workworkwork (your apps)

Production: b3z7MvoECnN9GKDZPNnVb0bywCL64ksvOXqog
Staging: lNi7mLNprbOIdIObSrcgdmESXruG4ksvOXqog

### USAGE ~@~T CLI Setup

# Login with credentials:

code-push login http://10.1.1.120:3000

# email: lisong2010@gmail.com

# password: admin123

# OR login with access key:

code-push access-key add http://10.1.1.120:3000

# paste: 767lQIb94OKpaiVQpT3vzw82MIRN4ksvOXqog

# Push your first release:

code-push release-react workworkwork_android android
code-push release-react workworkwork_ios ios

### USAGE ~@~T React Native App Code

1.  Android (android/app/build.gradle):

    buildTypes {
    release {
    buildConfigField "String", "CODEPUSH_KEY",
    '"mbPAYgoRZEVQVKRDqnjZb78qFGVL9GdU7v4vS"'
    }
    debug {
    buildConfigField "String", "CODEPUSH_KEY",
    '"Mtx3mCQn2OD9ZTmrEXPYIHETDKDY9GdU7v4vS"'
    }
    }

2.  iOS (Info.plist):

    <key>CodePushDeploymentKey</key>
    <string>Y4Ed7ceBvNWKhlZ9sesP9v2LRClV9GdU7v4vS</string>
    <key>CodePushServerURL</key>
    <string>http://10.1.1.120:3000</string>

3.  App entry point (App.tsx):

    import codePush from "react-native-code-push";

    3. App entry point (App.tsx):

    import codePush from "react-native-code-push";

    const codePushOptions = {
    checkFrequency: codePush.CheckFrequency.ON_APP_RESUME,
    installMode: codePush.InstallMode.ON_NEXT_RESUME,
    serverUrl: "http://10.1.1.120:3000",
    };

    export default codePush(codePushOptions)(MyApp);

## NOTE: No releases have been pushed yet to any app.

You must run "code-push release-react" before your
mobile apps will detect and download updates.

## CODE-PUSH CDN

Workflow # 1 code-push login http://10.1.1.120

# 2. Create apps

code-push app add MyApp-ios code-push app add MyApp-android

# 3. Get deployment keys (put these in your React Native app) code-push deployment ls MyApp-ios -k

code-push deployment ls MyApp-android -k

# 4. Release an update

cd your-react-native-project/
code-push release-react MyApp-ios ios -d Production

# 5. Removing an app

    code-push app rm <appName>
    For example:
        code-push app rm MyApp-ios

# 6. Create an API Token: Once logged in, click your profile icon (top-right)

    Account Settings - Go to API Tokens in the left sidebar -
    Click "New API token"
    - Give it a name (e.g., CLI Login), select Full Access
        click Create  - Copy the token immediately you won't see it again!
    - Come back here and paste it:
        code-push login --accessKey PASTE_YOUR_TOKEN_HERE
