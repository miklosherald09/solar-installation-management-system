/**
 * NotificationSettingsScreen
 * Reached from Profile → "Notifications".
 *
 * For now it exposes a single "enable / disable" toggle. Enabling requests OS
 * notification permission and registers the device token in the backend
 * (`device_tokens` table); disabling removes this device's tokens. The
 * preference is persisted on the User record (`notificationsEnabled`).
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuthStore, setAuthUser } from '../../store/useAuthStore';
import {
  enableNotifications,
  disableNotifications,
  updateNewWorkNotifications,
} from '../../services/pushNotificationService';
import { ProfileStackParamList } from '../../types';
import { useHideTabBar } from '../../navigation/useHideTabBar';

type NavigationProp = NativeStackNavigationProp<
  ProfileStackParamList,
  'NotificationSettings'
>;

export function NotificationSettingsScreen(): React.JSX.Element {
  useHideTabBar();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [enabled, setEnabled] = React.useState<boolean>(
    user?.notificationsEnabled ?? true,
  );
  const [newWorkEnabled, setNewWorkEnabled] = React.useState<boolean>(
    user?.newWorkNotificationsEnabled ?? true,
  );
  const [busy, setBusy] = React.useState(false);
  const [newWorkBusy, setNewWorkBusy] = React.useState(false);

  const handleToggle = async (value: boolean) => {
    if (busy || !user) return;
    setBusy(true);
    try {
      if (value) {
        const granted = await enableNotifications(user.id);
        if (!granted) {
          Alert.alert(
            'Notifications not enabled',
            'Notification access was not granted. You can enable it later from your device settings.',
          );
          return;
        }
      } else {
        await disableNotifications(user.id);
      }

      setEnabled(value);
      setAuthUser({ ...user, notificationsEnabled: value });
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.message ||
          'Could not update notification settings. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleNewWorkToggle = async (value: boolean) => {
    if (newWorkBusy || !user) return;
    setNewWorkBusy(true);
    try {
      await updateNewWorkNotifications(user.id, value);
      setNewWorkEnabled(value);
      setAuthUser({ ...user, newWorkNotificationsEnabled: value });
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.message ||
          'Could not update notification settings. Please try again.',
      );
    } finally {
      setNewWorkBusy(false);
    }
  };

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
            <View className="flex-1 mr-2">
              <Text className="text-2xl font-bold text-gray-900">
                Notifications
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
          Notification settings
        </Text>

        <View className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <View className="flex-row items-center px-5 py-4">
            <MaterialIcons name="notifications" size={22} color="#059669" />
            <View className="flex-1 ml-3">
              <Text className="text-base text-gray-900 font-medium">
                Enable notifications
              </Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                Receive alerts about your works and messages
              </Text>
            </View>
            {busy ? (
              <ActivityIndicator size="small" color="#059669" />
            ) : (
              <Switch
                value={enabled}
                onValueChange={handleToggle}
                trackColor={{ false: '#D1D5DB', true: '#059669' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#D1D5DB"
              />
            )}
          </View>
        </View>

        <View className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-4">
          <View className="flex-row items-center px-5 py-4">
            <MaterialIcons name="work-outline" size={22} color="#059669" />
            <View className="flex-1 ml-3">
              <Text className="text-base text-gray-900 font-medium">
                New work alerts
              </Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                Get notified when new work is posted within your search range
              </Text>
            </View>
            {newWorkBusy ? (
              <ActivityIndicator size="small" color="#059669" />
            ) : (
              <Switch
                value={newWorkEnabled}
                onValueChange={handleNewWorkToggle}
                disabled={!enabled}
                trackColor={{ false: '#D1D5DB', true: '#059669' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#D1D5DB"
              />
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
