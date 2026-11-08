/**
 * LoginScreen
 * Google sign-in gate.  Shown when the user is not authenticated.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppleSignInButton } from './profileSettings/AppleSignInButton';
import { GoogleSignInButton } from './profileSettings/GoogleSignInButton';
export function LoginScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-white">
      <View style={{ height: insets.top }} />
      <View className="flex-1 items-center justify-center px-8">
        {/* App logo / branding */}
        <View className="items-center mb-10">
          <Text className="text-2xl font-bold text-gray-900 text-center">
            Solar Installation Management System
          </Text>
          <Text className="text-sm text-gray-500 mt-2 text-center">
            Manage your solar installations.{'\n'}Sign in to get started.
          </Text>
        </View>

        {/* Google Sign-In button */}
        <GoogleSignInButton />
        <AppleSignInButton className="mt-3" />

        <Text className="text-xs text-gray-400 mt-6 text-center">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </View>
  );
}
