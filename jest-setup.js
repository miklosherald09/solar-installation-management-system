/* eslint-env jest */
// Jest setup — mock native modules for test environment

const MockView = 'MockView';
const MockText = 'MockText';

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: MockView,
  GestureDetector: MockView,
  Gesture: { Tap: () => ({}), Pan: () => ({}) },
  gestureHandlerRootHOC: (C: any) => C,
}));

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: {
    View: MockView,
    createAnimatedComponent: (C: any) => C,
    useSharedValue: () => ({ value: 0 }),
    useAnimatedStyle: () => ({}),
    withTiming: () => ({}),
    withSpring: () => ({}),
    runOnJS: (fn: any) => fn,
  },
  useSharedValue: () => ({ value: 0 }),
  useAnimatedStyle: () => ({}),
  withTiming: () => ({}),
  withSpring: () => ({}),
  runOnJS: (fn: any) => fn,
  createAnimatedComponent: (C: any) => C,
  Animated: { View: MockView },
}));

jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetModalProvider: MockView,
  BottomSheetModal: MockView,
  BottomSheetView: MockView,
  BottomSheetBackdrop: MockView,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-paper', () => ({
  Provider: ({ children }: any) => children,
  PaperProvider: ({ children }: any) => children,
  Text: MockText,
  TextInput: MockView,
  Button: MockView,
  Card: ({ children }: any) => children,
  Avatar: { Image: MockView, Text: MockView, Icon: MockView },
  IconButton: MockView,
  Searchbar: MockView,
  Chip: MockView,
  ActivityIndicator: MockView,
  Badge: MockView,
  Banner: MockView,
  BottomNavigation: MockView,
  Snackbar: MockView,
  Portal: MockView,
  Modal: MockView,
  Dialog: MockView,
  Menu: MockView,
  Divider: MockView,
  List: { Item: MockView, Icon: MockView, Section: MockView, Subheader: MockView },
  TouchableRipple: MockView,
  RadioButton: MockView,
  Checkbox: MockView,
  Switch: MockView,
  ProgressBar: MockView,
  HelperText: MockView,
  useTheme: () => ({ colors: {} }),
  withTheme: (C: any) => C,
  configureFonts: () => ({}),
  DefaultTheme: {},
  DarkTheme: {},
}));

jest.mock('@react-native-firebase/app', () => ({}));
jest.mock('@react-native-firebase/messaging', () => ({
  default: () => ({
    getToken: jest.fn(),
    onMessage: jest.fn(),
    onNotificationOpenedApp: jest.fn(),
    getInitialNotification: jest.fn(() => Promise.resolve(null)),
  }),
}));

['MaterialCommunityIcons','MaterialIcons','Ionicons','FontAwesome','FontAwesome5',
 'Feather','AntDesign','Entypo','EvilIcons','Foundation','Octicons',
 'SimpleLineIcons','Zocial'].forEach(icon =>
  jest.mock(`react-native-vector-icons/${icon}`, () => 'Icon'));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(() => Promise.resolve()),
  getGenericPassword: jest.fn(() => Promise.resolve(false)),
  resetGenericPassword: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
}));

jest.mock('react-native-webrtc', () => ({
  RTCPeerConnection: jest.fn().mockImplementation(() => ({
    iceGatheringState: 'complete',
    remoteDescription: null,
    localDescription: null,
    createAnswer: jest.fn(() => Promise.resolve({ type: 'answer', sdp: '' })),
    createOffer: jest.fn(() => Promise.resolve({ type: 'offer', sdp: '' })),
    setLocalDescription: jest.fn(() => Promise.resolve()),
    setRemoteDescription: jest.fn(() => Promise.resolve()),
    addTrack: jest.fn(),
    close: jest.fn(),
  })),
  mediaDevices: {
    getUserMedia: jest.fn(() =>
      Promise.resolve({ getTracks: () => [], getAudioTracks: () => [] }),
    ),
    getDisplayMedia: jest.fn(),
  },
  MediaStream: class MediaStream {},
  RTCIceCandidate: class RTCIceCandidate {},
  RTCSessionDescription: class RTCSessionDescription {},
  RTCView: MockView,
}));

jest.mock('react-native-incall-manager', () => ({
  __esModule: true,
  default: {
    start: jest.fn(),
    stop: jest.fn(),
    setMicrophoneMute: jest.fn(),
    setForceSpeakerphoneOn: jest.fn(),
    setSpeakerphoneOn: jest.fn(),
    setKeepScreenOn: jest.fn(),
    checkRecordPermission: jest.fn(),
    requestRecordPermission: jest.fn(),
    startRingtone: jest.fn(),
    stopRingtone: jest.fn(),
    startRingback: jest.fn(),
    stopRingback: jest.fn(),
  },
}));

jest.mock('react-native-callkeep', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  setup: jest.fn(),
  displayIncomingCall: jest.fn(),
  startCall: jest.fn(),
  endCall: jest.fn(),
  endAllCalls: jest.fn(),
  answerIncomingCall: jest.fn(),
  reportConnectedOutgoingCallWithUUID: jest.fn(),
  reportConnectingOutgoingCallWithUUID: jest.fn(),
  setMutedCall: jest.fn(),
  setAudioRoute: jest.fn(),
  setAvailable: jest.fn(),
  isCallActive: jest.fn(() => Promise.resolve(false)),
  getCalls: jest.fn(() => Promise.resolve([])),
  canMakeMultipleCalls: jest.fn(),
}));

jest.mock('react-native-voip-push-notification', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    registerVoipToken: jest.fn(),
    onVoipNotificationCompleted: jest.fn(),
    RNVoipPushRemoteNotificationsRegisteredEvent:
      'RNVoipPushRemoteNotificationsRegisteredEvent',
    RNVoipPushRemoteNotificationReceivedEvent:
      'RNVoipPushRemoteNotificationReceivedEvent',
    RNVoipPushDidLoadWithEvents: 'RNVoipPushDidLoadWithEvents',
  },
}));

jest.mock('react-native-maps', () => ({
  __esModule: true,
  default: MockView,
  Marker: MockView,
  Callout: MockView,
  Polyline: MockView,
  Polygon: MockView,
  Circle: MockView,
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    signIn: jest.fn(),
    signOut: jest.fn(),
    isSignedIn: jest.fn(() => Promise.resolve(false)),
    getCurrentUser: jest.fn(() => Promise.resolve(null)),
    configure: jest.fn(),
  },
}));

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: any) => children,
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  }),
  useRoute: () => ({ params: {}, name: '' }),
  useIsFocused: () => true,
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ children }: any) => children,
  }),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ children }: any) => children,
  }),
}));
