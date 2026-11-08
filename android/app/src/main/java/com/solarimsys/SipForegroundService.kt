package com.solarimsys

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

/**
 * Foreground service that keeps the process (and therefore the SIP WebSocket)
 * alive while the app is backgrounded. A plain foreground service is enough to
 * raise process priority; media/mic capture happens in the app's own WebRTC
 * stack, not here, so no special foregroundServiceType is required.
 */
class SipForegroundService : Service() {

  companion object {
    const val CHANNEL_ID = "sip_foreground_channel"
    const val INCOMING_CHANNEL_ID = "sip_incoming_call_channel"
    const val NOTIFICATION_ID = 4001

    var instance: SipForegroundService? = null
      private set

    fun start(context: Context, title: String? = null, text: String? = null) {
      val intent = Intent(context, SipForegroundService::class.java).apply {
        if (!title.isNullOrEmpty()) putExtra("title", title)
        if (!text.isNullOrEmpty()) putExtra("text", text)
      }
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          context.startForegroundService(intent)
        } else {
          context.startService(intent)
        }
      } catch (_: Exception) {
        // ForegroundServiceStartNotAllowedException (Android 12+) — the OS may
        // disallow starting from the background. Best effort only.
      }
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, SipForegroundService::class.java))
    }
  }

  override fun onCreate() {
    super.onCreate()
    instance = this
    ensureChannels()
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        startForeground(
          NOTIFICATION_ID,
          buildForegroundNotification(),
          ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE,
        )
      } else {
        startForeground(NOTIFICATION_ID, buildForegroundNotification())
      }
    } catch (_: Exception) {
      // Prevent foreground service start exceptions from crashing the process
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val title = intent?.getStringExtra("title")
    val text = intent?.getStringExtra("text")
    if (!title.isNullOrEmpty() || !text.isNullOrEmpty()) {
      val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
      manager?.notify(NOTIFICATION_ID, buildForegroundNotification(title, text))
    }
    return START_NOT_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onDestroy() {
    instance = null
    super.onDestroy()
  }

  private fun ensureChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(NotificationManager::class.java)

    // FCM default channel (referenced in AndroidManifest.xml)
    manager.createNotificationChannel(
      NotificationChannel(
        "solarimsys_channel",
        "General notifications",
        NotificationManager.IMPORTANCE_DEFAULT,
      ).apply {
        description = "General push notifications"
        setShowBadge(true)
      },
    )

    manager.createNotificationChannel(
      NotificationChannel(
        CHANNEL_ID,
        "Call service",
        NotificationManager.IMPORTANCE_MIN,
      ).apply {
        description = "Keeps the call connection active"
        setShowBadge(false)
      },
    )

    manager.createNotificationChannel(
      NotificationChannel(
        INCOMING_CHANNEL_ID,
        "Incoming calls",
        NotificationManager.IMPORTANCE_HIGH,
      ).apply {
        description = "Alerts for incoming calls"
        setShowBadge(true)
        // Ring audibly + vibrate even when the app is killed.
        val ringtone = android.media.RingtoneManager.getDefaultUri(
          android.media.RingtoneManager.TYPE_RINGTONE,
        )
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

  fun buildForegroundNotification(titleOverride: String? = null, textOverride: String? = null): Notification {
    val openAppIntent = PendingIntent.getActivity(
      this,
      0,
      Intent(this, MainActivity::class.java).apply {
        addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
      },
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    val title = titleOverride ?: "Solar Installation Management System"
    val text = textOverride ?: "Call in progress"

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(title)
      .setContentText(text)
      .setSmallIcon(R.drawable.ic_stat_w)
      .setOngoing(true)
      .setContentIntent(openAppIntent)
      .setPriority(NotificationCompat.PRIORITY_MIN)
      .build()
  }
}

