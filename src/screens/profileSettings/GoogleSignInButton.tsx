import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  registerBackendAndSetUser,
  describeGoogleSignInError,
} from '../../services/googleAuthService';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

interface Props {
  className?: string;
}

export function GoogleSignInButton({ className }: Props): React.JSX.Element {
  const [signingIn, setSigningIn] = React.useState(false);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      // Cancellation is *returned*, not thrown.
      const signInResult = await GoogleSignin.signIn();
      if (signInResult.type === 'cancelled') {
        return;
      }

      const { user: googleUser, idToken } = signInResult.data;
      if (!googleUser) {
        throw new Error('No user info returned from Google');
      }

      // Throws (with the reason) if it can't produce a backend user, so a
      // failed sign-in can never leave the screen silently logged out.
      await registerBackendAndSetUser(idToken ?? undefined);
    } catch (error) {
      console.warn('[Profile] sign-in failed:', error);
      const message = describeGoogleSignInError(error);
      if (message) {
        Alert.alert('Sign-in failed', message);
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <TouchableOpacity
      className={`flex-row items-center bg-white border border-gray-300 rounded-xl px-6 py-3.5 w-full ${
        className ?? ''
      }`}
      style={{
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      }}
      activeOpacity={0.7}
      onPress={handleGoogleSignIn}
      disabled={signingIn}
    >
      {signingIn ? (
        <ActivityIndicator
          size="small"
          color="#4285F4"
          style={{ marginRight: 12 }}
        />
      ) : (
        <FontAwesome5 name="google" size={24} color="#4285F4" />
      )}
      <Text className="flex-1 text-base font-medium text-gray-800 text-center">
        {signingIn ? 'Signing in…' : 'Continue with Google'}
      </Text>
    </TouchableOpacity>
  );
}
