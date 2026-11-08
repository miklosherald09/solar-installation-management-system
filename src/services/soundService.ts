import { Platform } from 'react-native';

const isAndroid = Platform.OS === 'android';

try {
  require('../sounds/chord.mp3');
} catch {}

const iosAsset = (() => {
  if (isAndroid) return undefined;
  try {
    const r = require('react-native/Libraries/Image/resolveAssetSource');
    const resolve = r.default ?? r;
    const a = require('../sounds/chord.mp3');
    return resolve(a);
  } catch {
    return undefined;
  }
})();

function getSoundCtor() {
  try {
    const mod = require('react-native-sound');
    return mod.default ?? mod.Sound ?? mod;
  } catch (e) {
    console.error(e);
    return null;
  }
}

let chordSound: any = null;
let isLoaded = false;
let isLoading = false;
let pendingPlay = false;

export function preloadNotificationSound() {
  if (isLoaded || isLoading) return;
  isLoading = true;

  try {
    const Sound = getSoundCtor();
    if (!Sound) {
      isLoading = false;
      return;
    }

    try {
      if (Sound.setCategory) Sound.setCategory('Playback');
    } catch {}

    if (isAndroid) {
      chordSound = new Sound('chord.mp3', Sound.MAIN_BUNDLE, function (
        error: any,
      ) {
        isLoading = false;
        if (error) {
          chordSound = null;
          isLoaded = false;
        } else {
          isLoaded = true;
          if (pendingPlay) {
            pendingPlay = false;
            playLoadedSound();
          }
        }
      });
    } else if (iosAsset) {
      chordSound = new Sound(iosAsset.uri, undefined, function (error: any) {
        isLoading = false;
        if (error) {
          chordSound = null;
          isLoaded = false;
        } else {
          isLoaded = true;
          if (pendingPlay) {
            pendingPlay = false;
            playLoadedSound();
          }
        }
      });
    } else {
      isLoading = false;
    }
  } catch (e) {
    console.error(e);
    isLoading = false;
    isLoaded = false;
  }
}

function playLoadedSound() {
  if (!chordSound) return;
  try {
    chordSound.stop();
    chordSound.play((success: boolean) => {
      if (!success)
        console.warn('[SoundService] chord playback was interrupted');
    });
  } catch (e) {
    console.error(e);
  }
}

export function playNotificationSound() {
  if (isLoaded && chordSound) {
    playLoadedSound();
  } else {
    pendingPlay = true;
    preloadNotificationSound();
  }
}

preloadNotificationSound();
