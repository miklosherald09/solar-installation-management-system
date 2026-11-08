# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ============================================================================
# APP — native modules, services, & packages (must be kept)
# ============================================================================
-keep class com.solarimsys.** { *; }

# ============================================================================
# React Native core
# ============================================================================
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-dontwarn com.facebook.react.**

# JS bridge must not be renamed or stripped
-keepattributes *Annotation*,Signature,Exceptions,InnerClasses
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}
-keep class com.facebook.react.bridge.** { *; }

# Keep all legacy Native Modules and their methods
-keep class * extends com.facebook.react.bridge.ReactContextBaseJavaModule {
    @com.facebook.react.bridge.ReactMethod *;
    public <init>(...);
}

# Keep all New Architecture TurboModules
-keep class * implements com.facebook.react.turbomodule.core.interfaces.TurboModule {
    @com.facebook.react.bridge.ReactMethod *;
    public <init>(...);
}

# ============================================================================
# Google Sign-In / Google Play Services
# ============================================================================
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**
-keep class com.reactnativegooglesignin.** { *; }

# ============================================================================
# Firebase
# ============================================================================
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# ============================================================================
# react-native-reanimated
# ============================================================================
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# ============================================================================
# react-native-webrtc
# ============================================================================
-keep class org.webrtc.** { *; }
-dontwarn org.webrtc.**

# ============================================================================
# react-native-callkeep
# ============================================================================
-keep class io.wazo.callkeep.** { *; }

# ============================================================================
# react-native-voip-push-notification
# ============================================================================
-keep class com.reactlibrary.** { *; }
-keep class com.oney.** { *; }

# ============================================================================
# react-native-code-push
# ============================================================================
-keep class com.microsoft.codepush.** { *; }

# ============================================================================
# react-native-incall-manager
# ============================================================================
-keep class com.zxcpoiu.incallmanager.** { *; }

# ============================================================================
# react-native-gesture-handler
# ============================================================================
-keep class com.swmansion.gesturehandler.** { *; }

# ============================================================================
# react-native-screens
# ============================================================================
-keep class com.swmansion.rnscreens.** { *; }

# ============================================================================
# react-native-safe-area-context
# ============================================================================
-keep class com.th3rdwave.safeareacontext.** { *; }

# ============================================================================
# react-native-async-storage
# ============================================================================
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# ============================================================================
# react-native-keychain
# ============================================================================
-keep class com.oblador.keychain.** { *; }

# ============================================================================
# react-native-vector-icons
# ============================================================================
-keep class com.oblador.vectoricons.** { *; }

# ============================================================================
# react-native-maps
# ============================================================================
-keep class com.airbnb.android.react.maps.** { *; }

# ============================================================================
# react-native-geolocation
# ============================================================================
-keep class com.reactnativecommunity.geolocation.** { *; }

# ============================================================================
# react-native-image-picker
# ============================================================================
-keep class com.imagepicker.** { *; }

# ============================================================================
# react-native-apple-authentication
# ============================================================================
-keep class com.RNAppleAuthentication.** { *; }

# ============================================================================
# react-native-firebase (io.invertase.firebase)
# ============================================================================
-keep class io.invertase.firebase.** { *; }
-dontwarn io.invertase.firebase.**

# ============================================================================
# react-native-async-storage (org.reactnative.asyncstorage)
# ============================================================================
-keep class org.reactnative.asyncstorage.** { *; }

# ============================================================================
# react-native-community-datetimepicker
# ============================================================================
-keep class com.reactcommunity.rndatetimepicker.** { *; }

# ============================================================================
# react-native-community-slider
# ============================================================================
-keep class com.reactnativecommunity.slider.** { *; }

# ============================================================================
# JNI / Native method preservation (critical for New Architecture)
# ============================================================================
-keepclasseswithmembernames class * {
    native <methods>;
}

# ============================================================================
# react-native-webrtc CalledByNative reflection
# ============================================================================
-keepclassmembers class * {
    @org.webrtc.CalledByNative <methods>;
}
-keepclassmembers class * {
    @org.webrtc.CalledByNativeUnchecked <methods>;
}
