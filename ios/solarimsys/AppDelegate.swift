import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import UserNotifications
import FirebaseCore
import PushKit
import RNVoipPushNotification
import RNCallKeep
import AVFoundation
import CodePush

@main
class AppDelegate: UIResponder, UIApplicationDelegate, PKPushRegistryDelegate {
  var window: UIWindow?
  var voipRegistry: PKPushRegistry?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // ── Firebase: initialize before any Firebase service is used ──────────
    FirebaseApp.configure()

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "solarimsys",
      in: window,
      launchOptions: launchOptions
    )

    // ── Push Notifications: Request permission ────────────────────────────
    UNUserNotificationCenter.current().delegate = self
    UNUserNotificationCenter.current().requestAuthorization(
      options: [.alert, .badge, .sound]
    ) { granted, error in
      if let error = error {
        print("[Push] Permission error: \(error.localizedDescription)")
      }
      if granted {
        DispatchQueue.main.async {
          application.registerForRemoteNotifications()
        }
      }
    }

    // ── Audio session for VoIP calls ──────────────────────────────────────
    // Configure once at launch so incoming calls have microphone/speaker
    // access even when the app was killed and restarted by a VoIP push.
    configureAudioSession()

    // ── CallKit: configure the provider natively so incoming-call pushes ──
    // can be reported even before the React Native bridge is ready (e.g. when
    // the app is launched from a killed state by a VoIP push). The JS-side
    // RNCallKeep.setup() runs too late in that flow and is ignored here.
    //
    // Industry-standard iOS incoming-call flow:
    //   1. APNs VoIP push wakes the app (even from killed state).
    //   2. PKPushRegistryDelegate.didReceiveIncomingPushWith fires.
    //   3. We call reportNewIncomingCall(...) IMMEDIATELY — iOS 13+ kills
    //      the app if we take longer than ~0.5 s.
    //   4. CallKit shows the native full-screen incoming-call UI (with
    //      caller name, video/audio buttons, slide-to-answer).
    //   5. The JS bridge loads → voipPushService registers listeners →
    //      SIP stack initialises → INVITE arrives → handleIncomingInvite.
    //   6. If the INVITE already arrived (CallKit ringing), we don't
    //      double-display; if it arrives later, the native UI is already up.
    RNCallKeep.setup([
      "appName": "Solar Installation Management System",
      "supportsVideo": true,
      "maximumCallGroups": 1,
      "maximumCallsPerCallGroup": 1,
      "includesCallsInRecents": true,
      "iconTemplateImageName": "AppIcon",
      "ringtoneSound": "chord.m4a",
    ])

    // ── PushKit (VoIP push to wake app for incoming calls) ───────────────
    voipRegistry = PKPushRegistry(queue: DispatchQueue.main)
    voipRegistry?.delegate = self
    voipRegistry?.desiredPushTypes = Set([.voIP])

    return true
  }

  /// Configure AVAudioSession for VoIP calls (microphone + speaker).
  /// Called at launch and before every incoming push so the app always has
  /// the right audio permissions even on cold-start (killed → VoIP wake).
  private func configureAudioSession() {
    do {
      let session = AVAudioSession.sharedInstance()
      try session.setCategory(
        .playAndRecord,
        mode: .voiceChat,
        options: [.allowBluetooth, .allowBluetoothA2DP, .duckOthers],
      )
      try session.setActive(true, options: .notifyOthersOnDeactivation)
    } catch {
      print("[VoIP] Audio session configuration failed: \(error.localizedDescription)")
    }
  }

  // ── APNs token received → handed to Firebase ──────────────────────────
  func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    // Firebase Messaging will automatically pick up the APNs token
    // because @react-native-firebase/messaging swizzles this method.
    print("[Push] APNs token registered successfully")
  }

  func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    print("[Push] APNs registration failed: \(error.localizedDescription)")
  }

  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return RCTLinkingManager.application(app, open: url, options: options)
  }
}

// ── PushKit (VoIP) delegate methods ─────────────────────────────────────
extension AppDelegate {
  func pushRegistry(
    _ registry: PKPushRegistry,
    didUpdate pushCredentials: PKPushCredentials,
    for type: PKPushType
  ) {
    RNVoipPushNotificationManager.didUpdate(
      pushCredentials,
      forType: type.rawValue,
    )
  }

  func pushRegistry(
    _ registry: PKPushRegistry,
    didInvalidatePushTokenFor type: PKPushType
  ) {
    // RNVoipPushNotification library does not expose didInvalidatePushToken
    print("[Push] VoIP push token invalidated for type: \(type.rawValue)")
  }

  /// Industry-standard VoIP push handler — wakes the app, reports to CallKit,
  /// and sets up a safety timeout so iOS doesn't kill the app if JS never loads.
  ///
  /// Flow:
  ///   1. APNs VoIP push arrives → PKPushRegistryDelegate fires.
  ///   2. Extract caller info + UUID from the push payload.
  ///   3. Configure the audio session for VoIP (.voiceChat).
  ///   4. Call RNCallKeep.reportNewIncomingCall IMMEDIATELY — iOS 13+ requires
  ///      this within ~0.5 s or the app is force-terminated.
  ///   5. Store the completion handler with a 10 s timeout as a safety net
  ///      (JS calls onVoipNotificationCompleted to release it earlier).
  ///   6. Forward the push data to the JS layer via RNVoipPushNotificationManager
  ///      so voipPushService.ts can init the SIP stack when the bridge is ready.
  func pushRegistry(
    _ registry: PKPushRegistry,
    didReceiveIncomingPushWith payload: PKPushPayload,
    for type: PKPushType,
    completion: @escaping () -> Void
  ) {
    // Ensure the audio session is ready for a call (microphone + speaker).
    configureAudioSession()

    let dict = payload.dictionaryPayload
    let uuid = (dict["uuid"] as? String) ?? UUID().uuidString
    let callerId = (dict["callerId"] as? String)
      ?? (dict["handle"] as? String) ?? ""
    let callerName = (dict["callerName"] as? String)
      ?? callerId
      ?? "Incoming call"

    // Respect the video flag from the push payload so CallKit shows
    // video controls on the native incoming-call UI immediately, even
    // before the JS bridge is ready.
    let isVideo: Bool = {
      if let boolVal = dict["isVideo"] as? Bool { return boolVal }
      if let strVal = dict["isVideo"] as? String {
        return strVal == "true" || strVal == "1"
      }
      return false
    }()

    var isCompleted = false

    // ── Safety net: force-complete after 10 s if JS never loads ──────
    // Without this, a crash-looping JS bundle would cause iOS to kill the
    // app for failing to call completion(). The JS layer normally calls
    // onVoipNotificationCompleted() much sooner (when SIP registers /
    // the call is answered/declined).
    let timeoutWorkItem = DispatchWorkItem {
      if !isCompleted {
        isCompleted = true
        RNVoipPushNotificationManager.removeCompletionHandler(uuid)
        completion()
        print("[VoIP] Completion timeout — forcing completion for \\(uuid)")
      }
    }

    let completionWrapper = {
      DispatchQueue.main.async {
        if !isCompleted {
          isCompleted = true
          timeoutWorkItem.cancel()
          RNVoipPushNotificationManager.removeCompletionHandler(uuid)
          completion()
        }
      }
    }

    // Arm the 10-second safety timeout.
    DispatchQueue.main.asyncAfter(
      deadline: .now() + 10.0,
      execute: timeoutWorkItem,
    )

    // Store the completion so JS can call onVoipNotificationCompleted.
    RNVoipPushNotificationManager.addCompletionHandler(
      uuid,
      completionHandler: completionWrapper,
    )

    // Let JS know (for cached-event replay, token registration, etc.).
    RNVoipPushNotificationManager.didReceiveIncomingPush(
      with: payload,
      forType: type.rawValue,
    )

    // Report the incoming call to CallKit IMMEDIATELY (iOS 13+ requirement).
    // The app is terminated if this isn't called within a short time.
    RNCallKeep.reportNewIncomingCall(
      uuid,
      handle: callerId,
      handleType: "generic",
      hasVideo: isVideo,
      localizedCallerName: callerName,
      supportsHolding: false,
      supportsDTMF: false,
      supportsGrouping: false,
      supportsUngrouping: false,
      fromPushKit: true,
      payload: nil,
      withCompletionHandler: completionWrapper,
    )
  }
}

// ── Handle notification display in foreground ─────────────────────────
extension AppDelegate: UNUserNotificationCenterDelegate {
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    // Show the notification as a banner even when the app is in foreground
    if #available(iOS 14.0, *) {
      completionHandler([.banner, .sound, .badge])
    } else {
      completionHandler([.alert, .sound, .badge])
    }
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    // Tapping a notification opens the app — data is in response.notification.request.content.userInfo
    completionHandler()
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    CodePush.bundleURL()
#endif
  }
}
