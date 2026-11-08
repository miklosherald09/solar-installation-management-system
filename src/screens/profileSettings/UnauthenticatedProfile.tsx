import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../../types';
import {
  getAppVersionString,
  getBuildEnvironmentLabel,
} from '../../constants/version';
import { ProfileHeader } from './ProfileHeader';
import { GoogleSignInButton } from './GoogleSignInButton';
import { AppleSignInButton } from './AppleSignInButton';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'ProfileSettings'>;

export function UnauthenticatedProfile(): React.JSX.Element {
  const navigation = useNavigation<Nav>();

  return (
    <View className="flex-1 bg-white">
      <ProfileHeader onBackPress={() => navigation.goBack()} />
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
          <MaterialIcons name="person" size={36} color="#059669" />
        </View>
        <Text className="text-xl font-bold text-gray-900 mb-2">
          Sign in to continue
        </Text>
        <Text className="text-sm text-gray-500 text-center mb-8">
          Sign in with your Google account to post works, apply to jobs, and
          manage your profile.
        </Text>
        <GoogleSignInButton />
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
