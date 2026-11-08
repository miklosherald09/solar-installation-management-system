import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Linking,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Avatar } from './Avatar';
import { GoogleSignInButton } from '../screens/profileSettings/GoogleSignInButton';
import { AppleSignInButton } from '../screens/profileSettings/AppleSignInButton';
import { signInAsDemo } from '../services/demoAuthService';

const PRIVACY_POLICY_URL = 'https://solarimsys.online/privacy-policy';
const TERMS_URL = 'https://solarimsys.online/terms-and-conditions';

interface WelcomeModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * WelcomeModal
 * Shown when the user is not signed in.  Guides them to sign in with
 * Google / Apple or continue browsing as a guest.
 */
export function WelcomeModal({
  visible,
  onClose,
}: WelcomeModalProps): React.JSX.Element {
  const [signingIn, setSigningIn] = React.useState(false);

  const handleDemoSignIn = async () => {
    setSigningIn(true);
    try {
      // Logs the user in as the shared demo account.  On success the auth
      // store updates and the parent closes this modal automatically (it is
      // only shown while unauthenticated).
      await signInAsDemo();
    } catch (error) {
      console.warn('[WelcomeModal] demo sign-in failed:', error);
      Alert.alert(
        'Sign-in failed',
        'Could not sign in to the demo account. Please check your connection and try again.',
      );
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1">
        {/* Dimmed backdrop — tap to dismiss */}
        <Pressable
          className="absolute inset-0 bg-black/50"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close welcome modal"
        />

        <View className="flex-1 items-center justify-center px-6">
          <View className="w-full max-w-sm bg-white rounded-3xl px-6 py-10 items-center">
            {/* Avatar */}
            <Avatar size={96} iconName="perm-identity" />

            {/* Heading */}
            <Text className="text-2xl font-bold text-gray-900 mt-5">
              Welcome!
            </Text>
            <Text className="text-sm text-gray-500 mt-1 text-center">
              Sign in to continue
            </Text>

            {/* Sign-in buttons */}
            <View className="w-full mt-7 px-4">
              <GoogleSignInButton />
              <AppleSignInButton className="mt-3" />

              <View className="flex-row items-center my-6">
                <View className="flex-1 h-px bg-gray-200" />
                <Text className="px-3 text-sm text-gray-400">or</Text>
                <View className="flex-1 h-px bg-gray-200" />
              </View>

              <TouchableOpacity
                className="w-full py-3 items-center"
                activeOpacity={0.7}
                onPress={handleDemoSignIn}
                disabled={signingIn}
              >
                {signingIn ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator
                      size="small"
                      color="#059669"
                      style={{ marginRight: 8 }}
                    />
                    <Text className="text-base font-semibold text-emerald-600">
                      Signing in…
                    </Text>
                  </View>
                ) : (
                  <Text className="text-base font-semibold text-emerald-600">
                    Continue as demo account
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Legal */}
            <Text className="text-xs text-gray-400 w-48 text-center mt-6">
              By continuing you agree with our{' '}
              <Text
                className="text-emerald-600"
                onPress={() => Linking.openURL(TERMS_URL)}
              >
                Terms and Conditions
              </Text>{' '}
              and{' '}
              <Text
                className="text-emerald-600"
                onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
              >
                Privacy Policy
              </Text>
              .
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
