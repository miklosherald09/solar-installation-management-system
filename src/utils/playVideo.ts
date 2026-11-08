import { NativeModules, Platform, Linking, Alert } from 'react-native';

/**
 * Open a video URL or local video URI in the device's native media player.
 * On Android, uses native Intent.ACTION_VIEW via NativeModules.SipCall.playVideo
 * for full hardware-accelerated playback and full-screen controls, with
 * fallback to React Native Linking.openURL.
 * On iOS, uses Linking.openURL to open Apple's native AVPlayer media player.
 */
export async function playVideo(videoUrl: string): Promise<boolean> {
  if (!videoUrl) return false;

  const trimmed = videoUrl.trim();
  if (!trimmed) return false;

  // On Android, attempt native intent playback first for full hardware acceleration & controls
  if (Platform.OS === 'android' && NativeModules.SipCall?.playVideo) {
    try {
      await NativeModules.SipCall.playVideo(trimmed);
      return true;
    } catch (err: any) {
      console.warn(
        '[playVideo] SipCall.playVideo failed, trying Linking fallback:',
        err,
      );
    }
  }

  // Fallback to Linking.openURL for iOS or if native call was not available
  try {
    const canOpen = await Linking.canOpenURL(trimmed);
    if (canOpen) {
      await Linking.openURL(trimmed);
      return true;
    } else {
      await Linking.openURL(trimmed);
      return true;
    }
  } catch (err: any) {
    console.warn('[playVideo] Linking.openURL failed:', err);
    Alert.alert(
      'Unable to play video',
      err?.message || 'No video player found to open this video.',
    );
    return false;
  }
}
