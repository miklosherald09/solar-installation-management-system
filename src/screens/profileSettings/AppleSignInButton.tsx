/**
 * AppleSignInButton
 * "Continue with Apple" button.  Shows on iOS (native flow) and on Android
 * (web flow) once the Service ID + redirect URI are configured.
 */

import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import {
  signInWithApple,
  registerBackendAndSetUser,
  describeAppleSignInError,
} from '../../services/appleAuthService';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface Props {
  className?: string;
}

export function AppleSignInButton({
  className,
}: Props): React.JSX.Element | null {
  const [signingIn, setSigningIn] = React.useState(false);

  const handleAppleSignIn = async () => {
    setSigningIn(true);
    try {
      const result = await signInWithApple();
      // Throws (with the reason) if it can't produce a backend user.
      await registerBackendAndSetUser(result);
    } catch (error) {
      console.warn('[Profile] apple sign-in failed:', error);
      const message = describeAppleSignInError(error);
      if (message) {
        Alert.alert('Sign-in failed', message);
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <TouchableOpacity
      className={`flex-row items-center bg-black rounded-xl px-6 py-3.5 w-full ${
        className ?? ''
      }`}
      activeOpacity={0.7}
      onPress={handleAppleSignIn}
      disabled={signingIn}
    >
      {signingIn ? (
        <ActivityIndicator
          size="small"
          color="#FFFFFF"
          style={{ marginRight: 12 }}
        />
      ) : (
        <MaterialIcons name="apple" size={28} color="#FFFFFF" />
      )}
      <Text className="flex-1 text-base font-semibold text-white text-center">
        {signingIn ? 'Signing in…' : 'Continue with Apple'}
      </Text>
    </TouchableOpacity>
  );
}
