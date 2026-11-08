/**
 * CallScreen
 * Full-screen in-call UI for the SIP softphone. Shows the remote party,
 * call status / duration, and mute / speaker / hangup controls.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Platform,
  AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  RouteProp,
  useIsFocused,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { RTCView } from 'react-native-webrtc';
import { HomeStackParamList } from '../../types';
import { useCallStore, CallStatus } from '../../store/useCallStore';
import {
  hangupActiveCall,
  answerActiveCall,
  setMuted,
  setSpeaker,
  setVideoEnabled,
  flipCamera,
} from '../../services/sipService';
import { getInitials } from '../conversation/helpers';
import { useHideTabBar } from '../../navigation/useHideTabBar';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Call'>;
type Route = RouteProp<HomeStackParamList, 'Call'>;

const STATUS_LABEL: Record<CallStatus, string> = {
  idle: 'Connecting…',
  calling: 'Calling…',
  incoming: 'Incoming call',
  ringing: 'Ringing…',
  connecting: 'Connecting…',
  active: 'In call',
  ended: 'Call ended',
};

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function CallScreen(): React.JSX.Element {
  useHideTabBar();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'android' ? insets.bottom : 0;

  const status = useCallStore(s => s.status);
  const call = useCallStore(s => s.call);
  const muted = useCallStore(s => s.muted);
  const speaker = useCallStore(s => s.speaker);
  const isVideo = useCallStore(s => s.isVideo);
  const videoEnabled = useCallStore(s => s.videoEnabled);
  const cameraFacing = useCallStore(s => s.cameraFacing);
  const localStream = useCallStore(s => s.localStream);
  const remoteStream = useCallStore(s => s.remoteStream);

  const [seconds, setSeconds] = React.useState(0);

  // Start the call timer once the call connects.
  React.useEffect(() => {
    if (status !== 'active') return;
    setSeconds(0);
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  const isFocused = useIsFocused();

  // Auto-close immediately after the call ends and redirect back.
  React.useEffect(() => {
    if (status !== 'ended') return;
    const timer = setTimeout(() => {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        (navigation as any).navigate('Main', { screen: 'MessagesTab' });
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [status, navigation]);

  // Protect against landing on CallScreen when no call is active.
  React.useEffect(() => {
    if (isFocused && (status === 'idle' || status === 'ended')) {
      const timer = setTimeout(() => {
        const currentStatus = useCallStore.getState().status;
        if (currentStatus === 'idle' || currentStatus === 'ended') {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            (navigation as any).navigate('Main', { screen: 'MessagesTab' });
          }
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isFocused, status, navigation]);

  // Reset the call store to idle state on unmount, but only when the call is
  // truly finished. If the screen is unmounted mid-call by a navigation race
  // (e.g. App.tsx switching tabs), keep the store intact so the SIP session
  // can continue and the replacement CallScreen picks up the live state.
  React.useEffect(() => {
    return () => {
      const s = useCallStore.getState().status;
      if (s === 'idle' || s === 'ended') {
        useCallStore.getState().reset();
      }
    };
  }, []);

  // Dismiss screen if call is ended when app returns to foreground from background
  React.useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && status === 'ended') {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          (navigation as any).navigate('Main', { screen: 'MessagesTab' });
        }
      }
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [status, navigation]);

  const displayName =
    call?.displayName || route?.params?.displayName || 'Unknown';
  const destination = call?.destination || route?.params?.destination || '';
  const photo = call?.photo ?? route?.params?.photo ?? null;

  // A call is a video call when the store says so (outgoing flag or incoming
  // SDP detection) or when the route param carries isVideo for cold-start UI.
  const isVideoCall = isVideo || !!route.params?.isVideo;

  const localStreamUrl =
    localStream && typeof (localStream as any).toURL === 'function'
      ? (localStream as any).toURL()
      : null;
  const remoteStreamUrl =
    remoteStream && typeof (remoteStream as any).toURL === 'function'
      ? (remoteStream as any).toURL()
      : null;

  const handleHangup = async () => {
    await hangupActiveCall();
  };

  const handleMute = async () => {
    await setMuted(!muted);
  };

  const handleSpeaker = async () => {
    await setSpeaker(!speaker);
  };

  const handleAnswer = async () => {
    await answerActiveCall();
  };

  const handleToggleVideo = async () => {
    await setVideoEnabled(!videoEnabled);
  };

  const handleFlipCamera = () => {
    flipCamera();
  };

  return (
    <View className="flex-1 bg-gray-900">
      <View style={{ height: insets.top }} />

      <View className="flex-1">
        {isVideoCall ? (
          <>
            {/* 1. Remote video background (when available) */}
            {remoteStreamUrl ? (
              <RTCView
                streamURL={remoteStreamUrl}
                objectFit="cover"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
                zOrder={0}
              />
            ) : localStreamUrl && videoEnabled ? (
              /* 1b. If remote stream is not yet available, show local camera full-screen */
              <RTCView
                streamURL={localStreamUrl}
                objectFit="cover"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
                mirror={cameraFacing === 'user'}
                zOrder={0}
              />
            ) : (
              /* 1c. If no video stream at all yet, show avatar / initials */
              <View className="flex-1 items-center justify-center px-6">
                {photo ? (
                  <Image
                    source={{ uri: photo }}
                    style={{ width: 96, height: 96, borderRadius: 48 }}
                    className="bg-gray-700"
                  />
                ) : (
                  <View className="w-24 h-24 rounded-full bg-emerald-500 items-center justify-center">
                    <Text className="text-3xl font-bold text-white">
                      {getInitials(displayName)}
                    </Text>
                  </View>
                )}
                <Text
                  className="text-white text-2xl font-bold mt-6"
                  numberOfLines={1}
                >
                  {displayName}
                </Text>
                <Text className="text-gray-400 text-base mt-2">
                  {status === 'active'
                    ? formatDuration(seconds)
                    : STATUS_LABEL[status]}
                </Text>
                {destination ? (
                  <Text className="text-gray-500 text-sm mt-1">
                    {destination}
                  </Text>
                ) : null}
              </View>
            )}

            {/* 2. Floating Picture-in-Picture (PIP) for local video when remote video is active */}
            {remoteStreamUrl && localStreamUrl && videoEnabled ? (
              <View
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  width: 112,
                  height: 176,
                  borderRadius: 12,
                  overflow: 'hidden',
                  backgroundColor: '#000',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.3)',
                  zIndex: 2,
                }}
              >
                <RTCView
                  streamURL={localStreamUrl}
                  objectFit="cover"
                  style={{ flex: 1 }}
                  mirror={cameraFacing === 'user'}
                  zOrder={1}
                />
              </View>
            ) : null}

            {/* 3. Overlay status badge / caller info when local stream is full-screen before remote connects */}
            {!remoteStreamUrl && localStreamUrl && videoEnabled ? (
              <View
                style={{
                  position: 'absolute',
                  top: 24,
                  left: 16,
                  right: 16,
                  alignItems: 'center',
                  zIndex: 3,
                }}
              >
                <View className="bg-black/60 px-4 py-2 rounded-2xl items-center">
                  <Text
                    className="text-white text-lg font-bold"
                    numberOfLines={1}
                  >
                    {displayName}
                  </Text>
                  <Text className="text-emerald-400 text-sm mt-0.5">
                    {status === 'active'
                      ? formatDuration(seconds)
                      : STATUS_LABEL[status]}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Status chip overlaid on remote video while establishing */}
            {remoteStreamUrl && status !== 'active' ? (
              <View
                style={{
                  position: 'absolute',
                  top: 16,
                  left: 0,
                  right: 0,
                  alignItems: 'center',
                  zIndex: 3,
                }}
              >
                <Text className="text-white text-base bg-black/50 px-3 py-1 rounded-full overflow-hidden">
                  {STATUS_LABEL[status]}
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <View className="flex-1 items-center justify-center px-6">
            {photo ? (
              <Image
                source={{ uri: photo }}
                style={{ width: 96, height: 96, borderRadius: 48 }}
                className="bg-gray-700"
              />
            ) : (
              <View className="w-24 h-24 rounded-full bg-emerald-500 items-center justify-center">
                <Text className="text-3xl font-bold text-white">
                  {getInitials(displayName)}
                </Text>
              </View>
            )}

            <Text
              className="text-white text-2xl font-bold mt-6"
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <Text className="text-gray-400 text-base mt-2">
              {status === 'active'
                ? formatDuration(seconds)
                : STATUS_LABEL[status]}
            </Text>
            {/* {destination ? (
              <Text className="text-gray-500 text-sm mt-1">{destination}</Text>
            ) : null} */}
          </View>
        )}
      </View>

      {/* Secondary controls: speaker / camera / flip — only during video calls so
          the primary row never overflows small screens. */}
      {isVideoCall ? (
        <View
          style={{ paddingBottom: 12 }}
          className="flex-row items-center justify-center"
        >
          <View className="items-center mx-5">
            <TouchableOpacity
              onPress={handleSpeaker}
              className={`w-14 h-14 rounded-full items-center justify-center ${
                speaker ? 'bg-white' : 'bg-gray-700'
              }`}
              accessibilityLabel={speaker ? 'Speaker off' : 'Speaker on'}
            >
              <MaterialIcons
                name={speaker ? 'volume-up' : 'volume-off'}
                size={24}
                color={speaker ? '#111827' : '#FFFFFF'}
              />
            </TouchableOpacity>
            <Text className="text-gray-300 text-xs mt-1.5">Speaker</Text>
          </View>

          <View className="items-center mx-5">
            <TouchableOpacity
              onPress={handleToggleVideo}
              className={`w-14 h-14 rounded-full items-center justify-center ${
                !videoEnabled ? 'bg-white' : 'bg-gray-700'
              }`}
              accessibilityLabel={
                videoEnabled ? 'Turn camera off' : 'Turn camera on'
              }
            >
              <MaterialIcons
                name={videoEnabled ? 'videocam' : 'videocam-off'}
                size={24}
                color={!videoEnabled ? '#111827' : '#FFFFFF'}
              />
            </TouchableOpacity>
            <Text className="text-gray-300 text-xs mt-1.5">
              {videoEnabled ? 'Camera' : 'Camera Off'}
            </Text>
          </View>

          <View className="items-center mx-5">
            <TouchableOpacity
              onPress={handleFlipCamera}
              className="w-14 h-14 rounded-full bg-gray-700 items-center justify-center"
              accessibilityLabel="Switch camera"
            >
              <MaterialIcons name="cameraswitch" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text className="text-gray-300 text-xs mt-1.5">Flip</Text>
          </View>
        </View>
      ) : null}

      <View
        style={{ paddingBottom: Math.max(bottomPad, 24) }}
        className="flex-row items-center justify-center"
      >
        <View className="items-center mx-6">
          <TouchableOpacity
            onPress={handleMute}
            className={`w-16 h-16 rounded-full items-center justify-center ${
              muted ? 'bg-white' : 'bg-gray-700'
            }`}
            accessibilityLabel={muted ? 'Unmute' : 'Mute'}
          >
            <MaterialIcons
              name={muted ? 'mic-off' : 'mic'}
              size={26}
              color={muted ? '#111827' : '#FFFFFF'}
            />
          </TouchableOpacity>
          <Text className="text-gray-300 text-xs mt-2">
            {muted ? 'Unmute' : 'Mute'}
          </Text>
        </View>

        {status === 'incoming' ? (
          <View className="items-center mx-6">
            <TouchableOpacity
              onPress={handleAnswer}
              className="w-16 h-16 rounded-full bg-emerald-500 items-center justify-center"
              accessibilityLabel="Answer call"
            >
              <MaterialIcons name="call" size={26} color="#FFFFFF" />
            </TouchableOpacity>
            <Text className="text-gray-300 text-xs mt-2">Answer</Text>
          </View>
        ) : null}

        <View className="items-center mx-6">
          <TouchableOpacity
            onPress={handleHangup}
            className="w-16 h-16 rounded-full bg-red-600 items-center justify-center"
            accessibilityLabel="End call"
          >
            <MaterialIcons name="call-end" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="text-gray-300 text-xs mt-2">End</Text>
        </View>

        {!isVideoCall ? (
          <View className="items-center mx-6">
            <TouchableOpacity
              onPress={handleSpeaker}
              className={`w-16 h-16 rounded-full items-center justify-center ${
                speaker ? 'bg-white' : 'bg-gray-700'
              }`}
              accessibilityLabel={speaker ? 'Speaker off' : 'Speaker on'}
            >
              <MaterialIcons
                name={speaker ? 'volume-up' : 'volume-off'}
                size={26}
                color={speaker ? '#111827' : '#FFFFFF'}
              />
            </TouchableOpacity>
            <Text className="text-gray-300 text-xs mt-2">Speaker</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
