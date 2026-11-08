import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import { MessagesHeader } from './MessagesHeader';
import { AppleSignInButton } from '../profileSettings/AppleSignInButton';
import { useNavigation } from '@react-navigation/native';
import {
  getAppVersionString,
  getBuildEnvironmentLabel,
} from '../../constants/version';
import { GoogleSignInButton } from '../profileSettings/GoogleSignInButton';

interface Props {
  topInset: number;
  headerTitle?: string;
  iconName?: string;
  title?: string;
  subtitle?: string;
}

/**
 * Full-screen sign-in prompt shown when the user is not authenticated.
 * Handles the Google sign-in flow and persists the resulting user.
 */
export function LoginPrompt({
  topInset,
  headerTitle = 'Messages',
  iconName = 'chat-bubble-outline',
  title = 'Sign in to continue',
  subtitle = 'Sign in with your Google account to view and manage your messages.',
}: Props) {
  const navigation = useNavigation<any>();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('HomeTab', { screen: 'Home' });
    }
  };

  return (
    <View className="flex-1 bg-white">
      <MessagesHeader
        topInset={topInset}
        title={headerTitle}
        onBackPress={handleBack}
      />

      {/* Login prompt */}
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
          <MaterialIcons name={iconName as any} size={36} color="#006742" />
        </View>
        <Text className="text-xl font-bold text-gray-900 mb-2">{title}</Text>
        <Text className="text-sm text-gray-500 text-center mb-8">
          {subtitle}
        </Text>

        {/* Google Sign-In button */}
        <GoogleSignInButton />
        {/* Apple Sign-In (iOS native / Android web flow) */}
        <AppleSignInButton className="mt-3" />
        <TouchableOpacity
          className="mt-8 flex-row items-center"
          activeOpacity={0.7}
          onPress={() => navigation.navigate('HelpSupport')}
        >
          <MaterialIcons name="help-outline" size={20} color="#059669" />
          <Text className="ml-2 text-sm font-semibold text-gray-700">
            Help & Support
          </Text>
        </TouchableOpacity>
      </View>
      <Text className="text-center text-xs text-gray-400">
        {getAppVersionString()}
      </Text>

      <Text className="text-center text-xs text-gray-400 mt-1 pb-6">
        {getBuildEnvironmentLabel()}
      </Text>
    </View>
  );
}
