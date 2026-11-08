/**
 * UserProfileSettingsScreen
 * Reachable from another user's profile via the ⋮ (more) button in the header.
 * Provides the standard "block / unblock" flow: tapping Block asks for
 * confirmation, calls the backend, then reflects the new state.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuthStore } from '../../store/useAuthStore';
import {
  useUserById,
  useBlockStatus,
  useBlockUserMutation,
  useToggleProBadgeMutation,
} from '../../hooks/useUsers';
import { HomeStackParamList } from '../../types';
import { useHideTabBar } from '../../navigation/useHideTabBar';
import { maskEmail } from '../../utils';
import { getInitials } from '../conversation/helpers';
import { ReportUserSheet } from '../../components/ReportUserSheet';
import { VerifiedBadge } from '../../components/VerifiedBadge';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'UserProfileSettings'>;
type Route = RouteProp<HomeStackParamList, 'UserProfileSettings'>;

export function UserProfileSettingsScreen(): React.JSX.Element {
  useHideTabBar();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuthStore();

  const { userId = '' } = route.params ?? {};
  const { data: user, isLoading: userLoading } = useUserById(userId);
  const { data: blockStatus, isLoading: statusLoading } = useBlockStatus(
    currentUser?.id,
    userId,
  );
  const blockMutation = useBlockUserMutation(userId);

  const isBlocked = !!blockStatus?.blocked;
  const isBlockedByThem = !!blockStatus?.blockedBy;
  const busy = blockMutation.isPending;

  const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN';
  const proBadgeMutation = useToggleProBadgeMutation(userId);
  const isUserPro = Boolean(user?.verifiedAt);

  const displayName = user?.name ?? 'this user';

  // Report sheet ref
  const reportSheetRef = React.useRef<BottomSheetModal>(null);

  const handleToggleProBadge = () => {
    if (isUserPro) {
      Alert.alert(
        'Remove Pro Badge?',
        `This will remove the "Verified Pro" status from ${displayName}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () =>
              proBadgeMutation.mutate(undefined, {
                onSuccess: () => {
                  Alert.alert(
                    'Pro Badge Removed',
                    `${displayName} is no longer a Verified Pro.`,
                  );
                },
                onError: (err: any) => {
                  Alert.alert(
                    'Could not update Pro Badge',
                    err?.message || 'Something went wrong. Please try again.',
                  );
                },
              }),
          },
        ],
      );
      return;
    }

    proBadgeMutation.mutate(undefined, {
      onSuccess: () => {
        Alert.alert(
          'Pro Badge Applied',
          `${displayName} is now a Verified Pro!`,
        );
      },
      onError: (err: any) => {
        Alert.alert(
          'Could not apply Pro Badge',
          err?.message || 'Something went wrong. Please try again.',
        );
      },
    });
  };

  /**
   * Standard block flow:
   * 1. Confirm with the user (irreversible warning).
   * 2. Call the block (or unblock) mutation.
   * 3. Surface success / failure and let the query invalidation flip the UI.
   */
  const handleBlockPress = () => {
    if (isBlocked) {
      Alert.alert(
        `Unblock ${displayName}?`,
        `${displayName} will be able to message you, call you, and see your profile again.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unblock',
            style: 'destructive',
            onPress: () =>
              blockMutation.mutate('unblock', {
                onSuccess: () => {
                  Alert.alert(
                    'Unblocked',
                    `${displayName} has been unblocked.`,
                  );
                },
                onError: (err: any) => {
                  Alert.alert(
                    'Could not unblock',
                    err?.message || 'Something went wrong. Please try again.',
                  );
                },
              }),
          },
        ],
      );
      return;
    }

    Alert.alert(
      `Block ${displayName}?`,
      'You will no longer receive messages, calls, or notifications from this user. You can unblock them anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () =>
            blockMutation.mutate('block', {
              onSuccess: () => {
                Alert.alert('Blocked', `${displayName} has been blocked.`);
              },
              onError: (err: any) => {
                Alert.alert(
                  'Could not block',
                  err?.message || 'Something went wrong. Please try again.',
                );
              },
            }),
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200">
        <View style={{ height: insets.top }} className="bg-white" />
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="flex-row items-center mr-3 p-1.5 rounded-full"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialIcons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">User Settings</Text>
        </View>
      </View>

      {/* User card */}
      <View className="bg-white mx-1 mt-4 rounded-2xl p-5 shadow-sm">
        <View className="flex-row items-center">
          {user?.photo ? (
            <Image
              source={{ uri: user.photo }}
              style={{ width: 56, height: 56, borderRadius: 28 }}
              className="bg-gray-200"
              resizeMode="cover"
            />
          ) : (
            <View className="w-14 h-14 rounded-full bg-emerald-100 items-center justify-center">
              <Text className="text-xl font-bold text-emerald-600">
                {getInitials(displayName)}
              </Text>
            </View>
          )}
          <View className="flex-1 ml-4">
            <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>
              {displayName}
            </Text>
            {user?.email ? (
              <Text className="text-sm text-gray-500 mt-0.5">
                {maskEmail(user.email)}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Admin: Pro Badge section */}
      {isAdmin && (
        <View className="bg-white mx-1 mt-4 rounded-2xl shadow-sm">
          <View className="flex-row items-center px-5 pt-4 pb-2">
            <MaterialIcons name="verified" size={18} color="#059669" />
            <Text className="text-base font-bold text-gray-900 ml-2">
              Pro Badge
            </Text>
          </View>

          <View className="px-5 pb-4">
            <View className="flex-row items-center justify-between mb-3 bg-gray-50 p-3 rounded-xl">
              <Text className="text-sm font-medium text-gray-700">Status</Text>
              <View>
                {isUserPro ? (
                  <VerifiedBadge showLabel />
                ) : (
                  <Text className="text-xs font-semibold text-gray-500 bg-gray-200 px-2.5 py-1 rounded-full">
                    Regular Member
                  </Text>
                )}
              </View>
            </View>
            <View className="mt-2">
              <TouchableOpacity
                onPress={handleToggleProBadge}
                disabled={proBadgeMutation.isPending || userLoading}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={
                  isUserPro ? 'Remove Pro Badge' : 'Apply Pro Badge'
                }
                className={`flex-row items-center justify-center rounded-xl border py-3.5 mt-1 ${
                  isUserPro
                    ? 'border-red-300 bg-red-50'
                    : 'border-emerald-600 bg-emerald-600'
                }`}
              >
                {proBadgeMutation.isPending ? (
                  <ActivityIndicator
                    size="small"
                    color={isUserPro ? '#DC2626' : '#FFFFFF'}
                  />
                ) : (
                  <>
                    <MaterialIcons
                      name={isUserPro ? 'remove-circle-outline' : 'verified'}
                      size={20}
                      color={isUserPro ? '#DC2626' : '#FFFFFF'}
                    />
                    <Text
                      className={`ml-2 text-base font-semibold ${
                        isUserPro ? 'text-red-700' : 'text-white'
                      }`}
                    >
                      {isUserPro ? 'Remove Pro Badge' : 'Apply Pro Badge'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <Text className="text-xs text-gray-400 leading-4 mt-3">
              {isUserPro
                ? `Removing the Pro Badge revokes the “Verified Pro” trust badge from ${displayName}’s profile and works.`
                : `Applying the Pro Badge grants ${displayName} the official “Verified Pro” trust badge across their profile and works.`}
            </Text>
          </View>
        </View>
      )}

      {/* Privacy / blocking */}
      <View className="bg-white mx-1 mt-6 rounded-2xl shadow-sm">
        <View className="flex-row items-center px-5 pt-4 pb-2">
          <MaterialIcons name="privacy-tip" size={18} color="#6B7280" />
          <Text className="text-base font-bold text-gray-900 ml-2">
            Privacy
          </Text>
        </View>

        <View className="px-5 pb-4">
          {userLoading || statusLoading ? (
            <View className="py-6 items-center">
              <ActivityIndicator size="small" color="#9CA3AF" />
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleBlockPress}
              disabled={busy}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={isBlocked ? 'Unblock user' : 'Block user'}
              className={`flex-row items-center justify-center rounded-xl border py-3.5 mt-1 ${
                isBlocked
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-red-300 bg-red-50'
              }`}
            >
              {busy ? (
                <ActivityIndicator
                  size="small"
                  color={isBlocked ? '#059669' : '#DC2626'}
                />
              ) : (
                <>
                  <MaterialIcons
                    name={isBlocked ? 'person-add-disabled' : 'block'}
                    size={20}
                    color={isBlocked ? '#059669' : '#DC2626'}
                  />
                  <Text
                    className={`ml-2 text-base font-semibold ${
                      isBlocked ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {isBlocked ? 'Unblock User' : 'Block User'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <Text className="text-xs text-gray-400 leading-4 mt-3">
            {isBlocked
              ? `${displayName} is blocked. They can’t message, call, or notify you.`
              : isBlockedByThem
              ? `${displayName} has blocked you, so you can’t message or call them.`
              : 'Blocking prevents this user from messaging, calling, or sending you notifications.'}
          </Text>
        </View>
      </View>

      {/* Report section */}
      <View className="bg-white mx-1 mt-4 rounded-2xl shadow-sm">
        <View className="flex-row items-center px-5 pt-4 pb-2">
          <MaterialIcons name="flag" size={18} color="#6B7280" />
          <Text className="text-base font-bold text-gray-900 ml-2">Safety</Text>
        </View>

        <View className="px-5 pb-4">
          <TouchableOpacity
            onPress={() => reportSheetRef.current?.present()}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Report user"
            className="flex-row items-center justify-center rounded-xl border py-3.5 mt-1 border-orange-300 bg-orange-50"
          >
            <MaterialIcons name="flag" size={20} color="#EA580C" />
            <Text className="ml-2 text-base font-semibold text-orange-700">
              Report User
            </Text>
          </TouchableOpacity>

          <Text className="text-xs text-gray-400 leading-4 mt-3">
            Reports are confidential. The user will not be notified about who
            reported them.
          </Text>
        </View>
      </View>

      {/* Report Sheet */}
      {currentUser?.id && (
        <ReportUserSheet
          sheetRef={reportSheetRef}
          reporterId={currentUser.id}
          reportedUserId={userId}
          reportedUserName={displayName}
        />
      )}
    </View>
  );
}
