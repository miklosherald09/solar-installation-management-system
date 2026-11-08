/**
 * AccountSecurityScreen
 * Reached from Profile → "Privacy & Security".
 *
 * This is also the only route to account deletion. The delete entry point is
 * deliberately buried here — low-emphasis, below the fold, in a separate
 * "Danger zone" block — so it can't be hit by accident from the main profile.
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuthStore } from '../../store/useAuthStore';
import { ProfileStackParamList } from '../../types';
import { useHideTabBar } from '../../navigation/useHideTabBar';

type NavigationProp = NativeStackNavigationProp<
  ProfileStackParamList,
  'AccountSecurity'
>;

interface InfoRowProps {
  icon: string;
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps): React.JSX.Element {
  return (
    <View className="flex-row items-center px-5 py-4 border-b border-gray-100">
      <MaterialIcons name={icon} size={20} color="#6B7280" />
      <View className="flex-1 ml-3">
        <Text className="text-base text-gray-900 font-medium">{label}</Text>
        <Text className="text-xs text-gray-500 mt-0.5">{value}</Text>
      </View>
    </View>
  );
}

export function AccountSecurityScreen(): React.JSX.Element {
  useHideTabBar();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const providerLabel =
    user?.provider === 'apple'
      ? 'Apple'
      : user?.provider === 'demo'
      ? 'Demo'
      : 'Google';

  return (
    <View className="flex-1 bg-gray-50">
      <View style={{ height: insets.top }} className="bg-white" />

      {/* Header */}
      <View className="bg-white border-b border-gray-200">
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mr-3 p-1.5 rounded-full"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View className="flex-1 mr-2">
            <Text className="text-2xl font-bold text-gray-900">
              Privacy & Security
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Sign-in */}
        <Text className="text-xs font-semibold text-gray-500 uppercase mx-5 mt-6 mb-2">
          Sign-in
        </Text>
        <View className="bg-white mx-5 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <InfoRow
            icon="account-circle"
            label={`Signed in with ${providerLabel}`}
            value={user?.email ?? '—'}
          />
          <InfoRow
            icon="devices"
            label="This device"
            value="Session active on this device only"
          />
        </View>

        {/* Privacy */}
        <Text className="text-xs font-semibold text-gray-500 uppercase mx-5 mt-6 mb-2">
          Privacy
        </Text>
        <View className="bg-white mx-5 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <InfoRow
            icon="visibility"
            label="Profile visibility"
            value="Your name and photo are shown on works you post"
          />
          <InfoRow
            icon="lock"
            label="Contact details"
            value="Shared only with people you message"
          />
        </View>

        {/* Danger zone — intentionally last, quiet, and one more tap away. */}
        <Text className="text-xs font-semibold text-gray-400 uppercase mx-5 mt-10 mb-2">
          Danger zone
        </Text>
        <View className="bg-white mx-5 rounded-2xl border border-gray-200 overflow-hidden">
          <TouchableOpacity
            className="flex-row items-center px-5 py-4"
            activeOpacity={0.6}
            onPress={() => navigation.navigate('DeleteAccount')}
          >
            <MaterialIcons name="delete-outline" size={20} color="#9CA3AF" />
            <View className="flex-1 ml-3">
              <Text className="text-sm text-gray-600 font-medium">
                Delete my account
              </Text>
              <Text className="text-xs text-gray-400 mt-0.5">
                Permanently disable access to this account
              </Text>
            </View>
            <Text className="text-gray-300 text-lg">›</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-xs text-gray-400 mx-5 mt-3 leading-4">
          Looking to take a break instead? You can simply log out from your
          profile — your works stay saved and nothing is removed.
        </Text>
      </ScrollView>
    </View>
  );
}
