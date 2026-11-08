/**
 * @format
 */

import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// ── Background / quit-state push notification handler ───────────────────
// Register a background message handler BEFORE the app is registered so
// that Firebase Messaging can display notifications even when the app is
// killed or in the background.
try {
  const fb = require('@react-native-firebase/app');
  if (fb.apps.length === 0) {
    fb.initializeApp();
  }
  const messaging = require('@react-native-firebase/messaging').default;

  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('[Push] Background message received:', remoteMessage.messageId);
    const data = remoteMessage.data || {};
    // VoIP wake: the backend sends a data-only message when there's an
    // incoming call for a device that is backgrounded or killed.
    if (data.type === 'incoming_call') {
      try {
        const {
          handleIncomingCallWake,
        } = require('./src/services/voipPushService');
        await handleIncomingCallWake(data);
      } catch (err) {
        console.warn('[Push] incoming_call wake failed:', err);
      }
    }
  });
} catch {
  // Firebase not linked yet — silently ignore
}

AppRegistry.registerComponent(appName, () => App);
