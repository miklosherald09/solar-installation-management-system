package com.solarimsys

import android.util.Log
import com.google.firebase.messaging.RemoteMessage
import io.invertase.firebase.messaging.ReactNativeFirebaseMessagingService

class CustomFirebaseMessagingService : ReactNativeFirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        Log.d("CustomFCM", "onMessageReceived: messageId=${remoteMessage.messageId}")
        val data = remoteMessage.data
        if (data.isNotEmpty() && data["type"] == "incoming_call") {
            if (!SipCallModule.isLoggedIn(applicationContext)) {
                Log.d("CustomFCM", "User is logged out — ignoring incoming call push.")
                return
            }
            val callerId = data["callerId"] ?: ""
            val callerName = data["callerName"] ?: ""
            // Backend sends isVideo as "1"/"0" (FCM data-only string values)
            val isVideo = data["isVideo"] == "true" || data["isVideo"] == "1"
            Log.d("CustomFCM", "incoming_call push: callerId=$callerId, callerName=$callerName, isVideo=$isVideo")

            try {
                // 1. Show native full-screen incoming call UI/notification
                SipCallModule.showIncomingCallNotification(applicationContext, callerId, callerName, isVideo)

                // 2. Launch MainActivity to spin up React Native bridge & register SIP stack immediately
                val launchIntent = android.content.Intent(applicationContext, MainActivity::class.java).apply {
                    flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_ACTIVITY_SINGLE_TOP
                    putExtra("incomingCall", true)
                    putExtra("answerCall", false)
                    putExtra("callerId", callerId)
                    putExtra("callerName", callerName)
                    putExtra("isVideo", isVideo)
                }
                applicationContext.startActivity(launchIntent)
            } catch (e: Exception) {
                Log.e("CustomFCM", "Failed to handle incoming call push natively", e)
            }
        }

        // Delegate to ReactNativeFirebaseMessagingService for standard JS handling
        super.onMessageReceived(remoteMessage)
    }
}
