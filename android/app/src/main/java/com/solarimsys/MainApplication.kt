package com.solarimsys

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.microsoft.codepush.react.CodePush
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here
          add(SipCallPackage())
        },
      jsBundleFilePath = CodePush.getJSBundleFile(),
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
    createNotificationChannel()
  }

  /**
   * Create the default notification channel required for FCM on Android 8+.
   * The channel ID must match the one in AndroidManifest.xml.
   */
  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        "solarimsys_channel",
        "Solar Installation Management System Notifications",
        NotificationManager.IMPORTANCE_DEFAULT
      ).apply {
        description = "Notifications for new messages and project updates"
        enableVibration(true)
        setShowBadge(true)
      }
      val manager = getSystemService(NotificationManager::class.java)
      manager.createNotificationChannel(channel)
    }
  }
}
