package com.solarimsys

import android.content.Intent
import android.content.pm.ActivityInfo
import android.os.Bundle
import androidx.core.view.WindowCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "solarimsys"

  /**
   * Switches from the splash screen theme (BootTheme) back to the normal AppTheme
   * before calling super.onCreate().
   */
  override fun onCreate(savedInstanceState: Bundle?) {
      supportFragmentManager.fragmentFactory = RNScreensFragmentFactory()
      setTheme(R.style.AppTheme)
      // react-native-screens fragments should never be restored from saved state —
      // doing so triggers "Screen fragments should never be restored" crash.
      // https://github.com/software-mansion/react-native-screens/issues/17
      super.onCreate(null)

      if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O_MR1) {
        setShowWhenLocked(true)
        setTurnScreenOn(true)
      } else {
        @Suppress("DEPRECATION")
        window.addFlags(
          android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
          android.view.WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
          android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        )
      }

      intent?.let {
          SipCallModule.handleNewIntent(it)
      }


      // Orientation policy:
      //  - Phones: locked to portrait (no landscape).
      //  - Tablets (smallest width >= 600dp): free to rotate to any orientation.
      requestedOrientation = if (resources.getBoolean(R.bool.is_tablet)) {
          ActivityInfo.SCREEN_ORIENTATION_FULL_SENSOR
      } else {
          ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
      }

      // The app renders a light UI and does not implement dark mode, but when the
      // OS is in dark mode React Native's edge-to-edge setup would otherwise show
      // white navigation-bar icons that are invisible on light content. Force dark
      // icons so the system navigation bar stays visible.
      WindowCompat.getInsetsController(window, window.decorView)
          .isAppearanceLightNavigationBars = true
  }

  /**
   * Forward intent extras to React Native when the activity is already running
   * (singleTask) and a notification is tapped. Without this the incoming-call
   * payload is lost because onCreate() is skipped.
   */
  override fun onNewIntent(intent: Intent?) {
      super.onNewIntent(intent)
      setIntent(intent)
      intent?.let {
          SipCallModule.handleNewIntent(it)
      }
  }

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
