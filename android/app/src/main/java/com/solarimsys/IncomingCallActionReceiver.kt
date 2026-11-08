package com.solarimsys

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Handles notification action button presses from the incoming-call
 * full-screen notification: ANSWER and DECLINE.
 *
 * ANSWER  – opens MainActivity (same as tapping the notification).
 * DECLINE – cancels the incoming-call notification, stops the foreground
 *           service, and emits a React Native event so the JS SIP stack
 *           can reject the call.
 */
class IncomingCallActionReceiver : BroadcastReceiver() {

  companion object {
    const val ACTION_ANSWER = "com.solarimsys.ACTION_ANSWER_CALL"
    const val ACTION_DECLINE = "com.solarimsys.ACTION_DECLINE_CALL"
  }

  override fun onReceive(context: Context, intent: Intent) {
    val manager =
      context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    when (intent.action) {
      ACTION_ANSWER -> {
        // Open the app — same as the full-screen intent tap. Setting
        // `answerCall` true makes App.tsx auto-answer the SIP call once the
        // JS bridge is ready (see setPendingAutoAnswer).
        try {
          val openIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("incomingCall", true)
            putExtra("answerCall", true)
            putExtra("callerId", intent.getStringExtra("callerId") ?: "")
            putExtra("callerName", intent.getStringExtra("callerName") ?: "")
            putExtra("isVideo", intent.getBooleanExtra("isVideo", false))
          }
          context.startActivity(openIntent)
        } catch (_: Exception) {
          // Prevent activity launch failure from crashing receiver
        }
      }

      ACTION_DECLINE -> {
        try {
          // Dismiss the incoming-call notification.
          manager.cancel(5001)
          // Stop the foreground service.
          SipForegroundService.stop(context)
          // Notify the JS layer (if running) so it can tear down the SIP session.
          SipCallModule.emitDeclineEvent()
        } catch (_: Exception) {
          // Safe fallback
        }
      }
    }
  }
}