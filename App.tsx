/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import './global.css';

import React from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import {
  configureGoogleSignIn,
  restoreGoogleSession,
} from './src/services/googleAuthService';
import {
  configureAppleSignIn,
  restoreAppleSession,
} from './src/services/appleAuthService';
import {
  initAuthStore,
  useAuthStore,
  getAuthState,
  setAuthInitialized,
  setQueryClientClearer,
} from './src/store/useAuthStore';
import { restoreSessionFromTokens } from './src/services/sessionService';
import {
  setLocationSyncQueryClient,
  syncLocationOnAppOpen,
} from './src/services/locationSyncService';
import { useCurrencyStore } from './src/store/useCurrencyStore';

import {
  initForegroundListeners,
  setNotificationTapHandler,
  requestPushNotif,
  listenForTokenRefresh,
  stopTokenRefreshListener,
} from './src/services/pushNotificationService';
import CodePush from '@bravemobile/react-native-code-push';
import { releaseHistoryFetcher } from './src/services/codePushService';
import {
  initSip,
  setPendingAutoAnswer,
  teardownSip,
  setGlobalQueryClient,
} from './src/services/sipService';
import { initCallWs, disconnectCallWs } from './src/services/callWsService';
import { useCallStore } from './src/store/useCallStore';
import AppStatusBar from './src/components/AppStatusBar';

import { setupCallKeep } from './src/services/callkeepService';
import { setupVoipPush } from './src/services/voipPushService';
import {
  getAndClearIncomingCallIntent,
  onNativeCallIntent,
  setLoginState,
  type SipCallIntentData,
} from './src/services/sipForegroundService';

// Configure Google Sign-In once at module level (before any component mounts)
configureGoogleSignIn();
// Configure Apple Sign-In (iOS only — no-op on Android)
configureAppleSignIn();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes
      networkMode: 'offlineFirst',
    },
  },
});
setGlobalQueryClient(queryClient);
setLocationSyncQueryClient(queryClient);
setQueryClientClearer(() => {
  queryClient.clear();
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  throttleTime: 1000,
});

// ---------------------------------------------------------------------------
// Inner component so we can use hooks (NavigationContainer must already exist)
// ---------------------------------------------------------------------------

function AppInner() {
  const navigation = useNavigation<any>();
  const { user, isAuthenticated, loading } = useAuthStore();
  const callStatus = useCallStore(s => s.status);
  const activeCall = useCallStore(s => s.call);
  // const [appState, setAppState] = useState<any>(AppState.currentState);

  // ── Redirect to HomeScreen on explicit login only ───────────────────────
  // Note: Session restoration on app open is not an explicit login.
  // We use `hasInitializedRef` so cold-start session restore doesn't override
  // deep links or notification tap navigation.
  const hasInitializedRef = React.useRef(false);
  const prevAuthRef = React.useRef(isAuthenticated);

  React.useEffect(() => {
    if (loading) return;

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      prevAuthRef.current = isAuthenticated;
      return;
    }

    if (isAuthenticated && !prevAuthRef.current) {
      const currentStatus = useCallStore.getState().status;
      const isCallActiveOrIncoming =
        currentStatus === 'incoming' ||
        currentStatus === 'connecting' ||
        currentStatus === 'ringing' ||
        currentStatus === 'active';

      if (!isCallActiveOrIncoming) {
        console.log('[App] Redirecting to HomeScreen after explicit login');
        navigation.navigate('Main', {
          screen: 'HomeTab',
          params: {
            screen: 'Home',
          },
        });
      }
    }

    prevAuthRef.current = isAuthenticated;
  }, [loading, isAuthenticated, navigation]);

  // ── Register device token & listen for refreshes ────────────────────
  React.useEffect(() => {
    if (user?.id) {
      const setupPush = async () => {
        const granted = await requestPushNotif(user.id);
        console.log('requestPushNotif', granted ? true : false);
        await listenForTokenRefresh(() => getAuthState().user?.id);
      };
      setupPush();
    }
    return () => {
      stopTokenRefreshListener();
    };
  }, [user?.id]);

  // ── Sync native login state for background call pushes ──────────────
  React.useEffect(() => {
    setLoginState(!!user?.id);
  }, [user?.id]);

  // ── Start the SIP softphone stack once signed in ────────────────────
  React.useEffect(() => {
    if (user?.id) {
      initSip(user.id).catch(err => {
        console.warn('[SIP] init failed:', err);
      });
    }
    return () => {
      teardownSip().catch(err => {
        console.warn('[SIP] teardown failed:', err);
      });
    };
  }, [user?.id]);

  // ── Track active AppState for foreground call intent handling ────────
  // React.useEffect(() => {
  //   const sub = AppState.addEventListener('change', state => {
  //     setAppState(state);
  //   });
  //   return () => sub.remove();
  // }, []);

  // ── Cold-start & background incoming-call recovery ─────────────────
  const handleCallIntent = React.useCallback(
    (intentData: SipCallIntentData, options?: { isColdStart?: boolean }) => {
      console.warn('[App] Incoming call intent:', intentData, options);

      const store = useCallStore.getState();

      // Preserve any isVideo flag that may have been set in the store
      // (e.g. from an already-arrived INVITE) and pass it through navigation
      // params so the CallScreen can render video controls immediately.
      const isVideo = store.isVideo || intentData.isVideo || false;

      useCallStore.getState().setCall({
        callId: store.call.callId || null,
        destination: intentData.callerId,
        displayName: intentData.callerName,
        photo: null,
      });

      useCallStore.getState().setIsVideo(isVideo);
      useCallStore.getState().setVideoEnabled(isVideo);

      if (intentData.answerCall) {
        setPendingAutoAnswer(true);
        if (store.status !== 'active') {
          useCallStore.getState().setStatus('connecting');
        }
      } else {
        if (store.status !== 'active' && store.status !== 'connecting') {
          useCallStore.getState().setStatus('incoming');
        }
      }

      // Navigate to 'Call' screen on cold-start wake or when the user explicitly answers.
      if (intentData.answerCall || options?.isColdStart) {
        navigation.navigate('Call', {
          destination: intentData.callerId,
          displayName: intentData.callerName,
          isVideo,
        });
      }
    },
    [navigation],
  );

  // When the app is killed and a VoIP wake hits, the full-screen
  // notification or Answer button launches MainActivity with intent extras
  // (incomingCall, answerCall, callerId, callerName).
  const lastIntentHandledAtRef = React.useRef(0);
  React.useEffect(() => {
    // Wait until auth initialization completes (loading === false) so that
    // RootStack.Navigator is mounted by AppNavigator before we attempt navigation.
    if (loading) return;

    getAndClearIncomingCallIntent()
      .then(intentData => {
        if (!intentData?.incomingCall && !intentData?.answerCall) return;
        lastIntentHandledAtRef.current = Date.now();
        handleCallIntent(intentData, { isColdStart: true });
      })
      .catch(err => {
        console.warn('[App] getAndClearIncomingCallIntent failed:', err);
      });
  }, [handleCallIntent, loading]);

  // When the app is in the background and a notification / Answer button is tapped
  React.useEffect(() => {
    const unsub = onNativeCallIntent(data => {
      if (data.incomingCall || data.answerCall) {
        lastIntentHandledAtRef.current = Date.now();
        handleCallIntent(data);
      }
    });
    return unsub;
  }, [handleCallIntent]);

  // ── One-time CallKit setup + VoIP Push registration (iOS) ───────────
  React.useEffect(() => {
    setupCallKeep();
    if (user?.id) {
      setupVoipPush(user.id);
    }
  }, [user?.id]);

  // ── Call WebSocket connection lifecycle (Active & Background) ─────────
  React.useEffect(() => {
    if (user?.id) {
      initCallWs(user.id);
    } else {
      disconnectCallWs();
    }
    return () => {
      disconnectCallWs();
    };
  }, [user?.id]);

  // ── Sync user location & near-me on startup ─────────────────────────
  // When a user has an empty location (location, concise_location, longitude, latitude),
  // silently get GPS location on app open and persist to the database, while also
  // ensuring near-me preferences are hydrated or seeded.
  React.useEffect(() => {
    if (!user?.id) return;
    syncLocationOnAppOpen(user.id).catch(err => {
      console.warn('[App] syncLocationOnAppOpen failed:', err);
    });
  }, [user?.id]);

  // ── Navigate to the Call screen when a call is active ────────────────
  React.useEffect(() => {
    if (!user?.id) return;
    // On iOS the in-app CallScreen (with its own green Answer button) is the
    // user's way to answer when CallKit doesn't take over (e.g. the push was
    // slow or was never reported). Android keeps the previous behaviour of
    // only navigating once a call is actually connecting/active.
    const showIncomingUi =
      Platform.OS === 'ios' &&
      (callStatus === 'incoming' || callStatus === 'ringing');
    if (
      showIncomingUi ||
      callStatus === 'connecting' ||
      callStatus === 'active'
    ) {
      const routes = navigation.getState()?.routes;
      const currentRoute = routes?.[routes.length - 1];
      if (currentRoute?.name === 'Call') return;

      const store = useCallStore.getState();
      navigation.navigate('Call', {
        destination: activeCall.destination || '',
        displayName: activeCall.displayName || '',
        photo: activeCall.photo || null,
        isVideo: store.isVideo,
      });
    }
  }, [
    user?.id,
    callStatus,
    activeCall.destination,
    activeCall.displayName,
    activeCall.photo,
    navigation,
  ]);

  // ── Handle notification tap → navigate ──────────────────────────────
  const pendingNotificationRef = React.useRef<any>(null);

  const navigateToNotification = React.useCallback(
    (data: any) => {
      try {
        console.log('[App] Navigating to notification payload:', data);
        if (data.conversationId) {
          navigation.navigate('Main', {
            screen: 'MessagesTab',
            params: {
              screen: 'ConversationDetail',
              params: {
                conversationId: data.conversationId,
                partnerName: data.partnerName || 'Chat',
                partnerPhoto: data.partnerPhoto || null,
                partnerId: data.partnerId || '',
                partnerPhone: data.partnerPhone || null,
                workId: data.workId || undefined,
              },
            },
          });
        } else if (data.workId) {
          navigation.navigate('Main', {
            screen: 'HomeTab',
            params: { screen: 'WorkDetail', params: { workId: data.workId } },
          });
        }
      } catch (err) {
        console.warn('[App] Navigation on notification tap failed:', err);
      }
    },
    [navigation],
  );

  React.useEffect(() => {
    setNotificationTapHandler((data: any) => {
      if (loading) {
        pendingNotificationRef.current = data;
        return;
      }
      navigateToNotification(data);
    });

    initForegroundListeners();
  }, [loading, navigateToNotification]);

  // Flush any notification that was tapped during app startup once auth settles
  React.useEffect(() => {
    if (!loading && pendingNotificationRef.current) {
      const data = pendingNotificationRef.current;
      pendingNotificationRef.current = null;
      setTimeout(() => {
        navigateToNotification(data);
      }, 50);
    }
  }, [loading, navigateToNotification]);

  return <AppNavigator />;
}

/**
 * App
 * Root component with providers
 */
function App(): React.JSX.Element {
  // 1. Load persisted auth from AsyncStorage
  // 2. Then try to restore the Google session silently
  React.useEffect(() => {
    // Fetch device current location to initialize currency
    useCurrencyStore.getState().fetchDeviceLocation();

    initAuthStore()
      .then(async () => {
        // Token-based restore is the primary path: exchange the stored refresh
        // token for a fresh access token + user, independent of Google/Apple SDKs.
        // The SDK restores are a secondary path — they also validate OAuth
        // credential state (e.g. Apple credential revocation on iOS). We wait
        // for all of them before finalizing `loading` so the app never flashes
        // a logged-out welcome modal for a user who ends up signed in.
        await Promise.all([
          restoreSessionFromTokens(),
          restoreGoogleSession(),
          restoreAppleSession(),
        ]);
      })
      .finally(() => {
        // All restore paths have settled — release the loading gate so the
        // navigator can mount the app.
        setAuthInitialized();
      });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister }}
      >
        <PaperProvider>
          <SafeAreaProvider>
            <NavigationContainer>
              <AppStatusBar />
              <AppInner />
            </NavigationContainer>
          </SafeAreaProvider>
        </PaperProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}

export default CodePush({
  // Check for OTA updates every time the app cold-starts.
  checkFrequency: CodePush.CheckFrequency.ON_APP_START,
  // Install non-mandatory updates on the next restart (no silent immediate
  // restart). Mandatory updates also defer to the next restart for a smooth UX.
  installMode: CodePush.InstallMode.ON_NEXT_RESTART,
  mandatoryInstallMode: CodePush.InstallMode.ON_NEXT_RESTART,
  // Fetch the release history from our self-hosted MinIO static backend.
  releaseHistoryFetcher,
})(App);
