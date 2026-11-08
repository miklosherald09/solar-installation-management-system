package com.solarimsys

import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments

data class PendingCallIntent(
  val isIncoming: Boolean,
  val isAnswer: Boolean,
  val callerId: String,
  val callerName: String,
  val isVideo: Boolean
) {
  fun toWritableMap(): WritableMap {
    return Arguments.createMap().apply {
      putBoolean("incomingCall", isIncoming)
      putBoolean("answerCall", isAnswer)
      putString("callerId", callerId)
      putString("callerName", callerName)
      putBoolean("isVideo", isVideo)
    }
  }
}

/**
 * JS-accessible bridge for the SIP foreground service and the full-screen
 * incoming-call notification. Exposed to JS as `NativeModules.SipCall`.
 */
class SipCallModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "SipCall"

  companion object {
    private var instance: SipCallModule? = null
    private var pendingCallIntent: PendingCallIntent? = null

    fun isLoggedIn(context: Context): Boolean {
      val prefs = context.getSharedPreferences("solarimsys_prefs", Context.MODE_PRIVATE)
      return prefs.getBoolean("isLoggedIn", false)
    }

    /** Called by IncomingCallActionReceiver when DECLINE is pressed. */
    fun emitDeclineEvent() {
      instance?.emitDeclineToJS()
    }

    /** Called by MainActivity.onNewIntent and onCreate when the app is resumed/launched by tapping Answer or the notification. */
    fun handleNewIntent(intent: Intent) {
      val isIncoming = intent.getBooleanExtra("incomingCall", false)
      val isAnswer = intent.getBooleanExtra("answerCall", false)
      if (!isIncoming && !isAnswer) return

      val callerId = intent.getStringExtra("callerId") ?: ""
      val callerName = intent.getStringExtra("callerName") ?: ""
      val isVideo = intent.getBooleanExtra("isVideo", false)

      val data = PendingCallIntent(isIncoming, isAnswer, callerId, callerName, isVideo)
      pendingCallIntent = data

      instance?.processCallIntent(data)
    }

    private fun ensureIncomingChannel(context: Context) {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
      manager?.createNotificationChannel(
        NotificationChannel(
          SipForegroundService.INCOMING_CHANNEL_ID,
          "Incoming calls",
          NotificationManager.IMPORTANCE_HIGH,
        ).apply {
          description = "Alerts for incoming calls"
          val ringtone = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
          if (ringtone != null) {
            setSound(ringtone, android.media.AudioAttributes.Builder()
              .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
              .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
              .build())
          }
          enableVibration(true)
          vibrationPattern = longArrayOf(0, 500, 500, 500, 500)
        },
      )
    }

    fun showIncomingCallNotification(context: Context, callerId: String, displayName: String, isVideo: Boolean = false) {
      ensureIncomingChannel(context)

      // ── ANSWER action ──────────────────────────────────────────────
      val answerIntent = Intent(context, MainActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        putExtra("incomingCall", true)
        putExtra("answerCall", true)
        putExtra("callerId", callerId)
        putExtra("callerName", displayName)
        putExtra("isVideo", isVideo)
      }
      val answerPending = PendingIntent.getActivity(
        context, 2001, answerIntent,
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )

      // ── DECLINE action ─────────────────────────────────────────────
      val declineIntent = Intent(context, IncomingCallActionReceiver::class.java).apply {
        action = IncomingCallActionReceiver.ACTION_DECLINE
        putExtra("callerId", callerId)
        putExtra("callerName", displayName)
        putExtra("isVideo", isVideo)
      }
      val declinePending = PendingIntent.getBroadcast(
        context, 2002, declineIntent,
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )

      // ── Full-screen tap intent ─────────────────────────────────────
      val fullScreenIntent = PendingIntent.getActivity(
        context,
        1001,
        Intent(context, MainActivity::class.java).apply {
          flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
          putExtra("incomingCall", true)
          putExtra("answerCall", false)
          putExtra("callerId", callerId)
          putExtra("callerName", displayName)
          putExtra("isVideo", isVideo)
        },
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )

      val title = if (isVideo) "Video call — $displayName" else displayName.ifBlank { callerId }
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

      val canUseFullScreen = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        manager.canUseFullScreenIntent()
      } else {
        true
      }

      val ringtoneUri: Uri? = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)

      val notificationBuilder = NotificationCompat.Builder(
        context,
        SipForegroundService.INCOMING_CHANNEL_ID,
      )
        .setContentTitle("Incoming call")
        .setContentText(title)
        .setSmallIcon(R.drawable.ic_stat_w)
        .setPriority(NotificationCompat.PRIORITY_MAX)
        .setCategory(NotificationCompat.CATEGORY_CALL)
        .setOngoing(true)
        .setContentIntent(fullScreenIntent)
        // Keep the incoming-call alert out of the lock screen: PUBLIC
        // visibility shows the notification contents (and full-screen intent)
        // as an overlay over the lock screen, which makes Android ask the
        // user for one-time permission ("Allow ... to display an overlay on
        // the lock screen?"). PRIVATE still alerts normally when unlocked but
        // hides the contents and never displays the lock-screen overlay, so no
        // permission prompt is shown.
        .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
        .setOnlyAlertOnce(false)
        .apply {
          if (ringtoneUri != null) {
            setSound(ringtoneUri)
          }
          setVibrate(longArrayOf(0, 500, 500, 500, 500))
        }
        .addAction(
          R.drawable.ic_call_decline,
          "Decline",
          declinePending,
        )
        .addAction(
          R.drawable.ic_call_answer,
          "Answer",
          answerPending,
        )

      if (canUseFullScreen) {
        notificationBuilder.setFullScreenIntent(fullScreenIntent, true)
      }

      try {
        // Dismiss the silent foreground-service notification so the user
        // only sees ONE call notification (the full-screen incoming-call alert).
        manager.cancel(SipForegroundService.NOTIFICATION_ID)
        manager.notify(5001, notificationBuilder.build())
      } catch (_: SecurityException) {
        try {
          manager.notify(5001, notificationBuilder.setFullScreenIntent(null, false).build())
        } catch (_: Exception) {}
      } catch (_: Exception) {}
    }
  }

  init {
    instance = this
    // If we have cached intent data from launch, push it to JS as soon as the module is ready.
    pendingCallIntent?.let {
      processCallIntent(it)
    }
  }

  private fun emitDeclineToJS() {
    try {
      reactApplicationContext.emitDeviceEvent("sipDeclineCall", null)
    } catch (_: Exception) {
      // noop
    }
  }

  private fun processCallIntent(data: PendingCallIntent) {
    if (data.isAnswer) {
      val manager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
      manager?.cancel(5001)
    }

    try {
      reactApplicationContext.emitDeviceEvent("sipCallIntent", data.toWritableMap())
    } catch (_: Exception) {
      // noop
    }
  }

  @ReactMethod
  fun setLoginState(isLoggedIn: Boolean) {
    val context = reactApplicationContext
    val prefs = context.getSharedPreferences("solarimsys_prefs", Context.MODE_PRIVATE)
    prefs.edit().putBoolean("isLoggedIn", isLoggedIn).apply()
  }

  @ReactMethod
  fun addListener(eventName: String) { /* required for RN DeviceEventEmitter */ }

  @ReactMethod
  fun removeListeners(count: Int) { /* required for RN DeviceEventEmitter */ }

  @ReactMethod
  fun startForegroundService(title: String? = null, text: String? = null) {
    SipForegroundService.start(reactApplicationContext, title, text)
  }


  @ReactMethod
  fun stopForegroundService() {
    SipForegroundService.stop(reactApplicationContext)
  }

  @ReactMethod
  fun showIncomingCall(callerId: String, displayName: String, isVideo: Boolean = false) {
    showIncomingCallNotification(reactApplicationContext, callerId, displayName, isVideo)
  }

  @ReactMethod
  fun clearIncomingCall() {
    val manager =
      reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
    manager?.cancel(5001)
    // Restore the silent foreground-service notification now that the
    // full-screen incoming-call alert is gone.
    try {
      val service = SipForegroundService.instance
      if (service != null) {
        manager?.notify(
          SipForegroundService.NOTIFICATION_ID,
          service.buildForegroundNotification(),
        )
      }
    } catch (_: Exception) { }
  }

  /**
   * Called early by the JS bundle (e.g. App.tsx on mount) to check whether
   * the current Activity was launched from a full-screen incoming-call
   * notification or the Answer button. Returns { incomingCall, answerCall, callerId, callerName }
   * when such an intent is pending, and clears the extras so they are not
   * re-processed on every re-render. Returns null when no intent is present.
   */
  @ReactMethod
  fun getAndClearIncomingCallIntent(promise: Promise) {
    val cached = pendingCallIntent
    if (cached != null) {
      pendingCallIntent = null
      promise.resolve(cached.toWritableMap())
      return
    }

    val activity: Activity? = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.resolve(null)
      return
    }

    val intent = activity.intent
    if (intent == null) {
      promise.resolve(null)
      return
    }

    val isIncoming = intent.getBooleanExtra("incomingCall", false)
    val isAnswer = intent.getBooleanExtra("answerCall", false)
    if (!isIncoming && !isAnswer) {
      val extras = intent.extras
      if (extras == null || (!extras.containsKey("incomingCall") && !extras.containsKey("answerCall"))) {
        promise.resolve(null)
        return
      }
    }

    val callerId = intent.getStringExtra("callerId") ?: ""
    val callerName = intent.getStringExtra("callerName") ?: ""
    val isVideo = intent.getBooleanExtra("isVideo", false)

    intent.removeExtra("incomingCall")
    intent.removeExtra("answerCall")
    intent.removeExtra("callerId")
    intent.removeExtra("callerName")
    intent.removeExtra("isVideo")

    if (isAnswer) {
      val manager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
      manager?.cancel(5001)
    }

    val map: WritableMap = Arguments.createMap()
    map.putBoolean("incomingCall", isIncoming)
    map.putBoolean("answerCall", isAnswer)
    map.putString("callerId", callerId)
    map.putString("callerName", callerName)
    map.putBoolean("isVideo", isVideo)
    promise.resolve(map)
  }

  /**
   * Launch Android's default video player via ACTION_VIEW intent.
   * Handles local files, content URIs, and remote HTTP/HTTPS video streams.
   */
  @ReactMethod
  fun playVideo(videoUrl: String, promise: Promise) {
    try {
      val parsedUri = Uri.parse(videoUrl)
      if ("file".equals(parsedUri.scheme, ignoreCase = true)) {
        try {
          val builder = android.os.StrictMode.VmPolicy.Builder()
          android.os.StrictMode.setVmPolicy(builder.build())
        } catch (_: Exception) {}
      }

      val intent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(parsedUri, "video/*")
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }

      val context = reactApplicationContext.currentActivity ?: reactApplicationContext
      try {
        context.startActivity(intent)
        promise.resolve(true)
      } catch (_: android.content.ActivityNotFoundException) {
        try {
          val fallbackIntent = Intent(Intent.ACTION_VIEW, parsedUri).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
          }
          context.startActivity(fallbackIntent)
          promise.resolve(true)
        } catch (e2: Exception) {
          promise.reject("NO_VIDEO_APP", "No app available to play video: ${e2.message}", e2)
        }
      }
    } catch (e: Exception) {
      promise.reject("PLAY_VIDEO_ERROR", e.message, e)
    }
  }
}
