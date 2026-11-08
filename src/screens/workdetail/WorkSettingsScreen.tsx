/**
 * WorkSettingsScreen
 * Reached from the Work Detail "more" button (owner only).
 * Offers a single destructive action — deleting the work — which is guarded
 * by a confirmation alert and an ownership re-check. On success the user is
 * redirected back to the "Posted Works" list (AddedWork).
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  RouteProp,
  CommonActions,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { HomeStackParamList } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import { useWork, useDeleteWork, useWorkHistory } from '../../hooks/useWorks';
import { useWorkCurrency } from '../../hooks';
import { useHideTabBar } from '../../navigation/useHideTabBar';
import { formatTimeAgo } from '../messages/helpers';

type WorkSettingsNavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  'WorkSettings'
>;
type WorkSettingsRouteProp = RouteProp<HomeStackParamList, 'WorkSettings'>;

export function WorkSettingsScreen(): React.JSX.Element {
  useHideTabBar();
  const navigation = useNavigation<WorkSettingsNavigationProp>();
  const route = useRoute<WorkSettingsRouteProp>();
  const insets = useSafeAreaInsets();

  const { user } = useAuthStore();
  const { data: result, isLoading } = useWork(route.params.workId);
  const work = result?.status === 'found' ? result.work : undefined;
  const currencySymbol = useWorkCurrency(work);
  const { mutateAsync: deleteWork, isPending: deletingWork } = useDeleteWork();
  const { data: history, isLoading: historyLoading } = useWorkHistory(
    route.params.workId,
  );

  const isOwner = !!user && !!work && user.id === work.postedBy.id;

  const formatHistoryTime = (dateStr: string) => {
    try {
      const timeAgo = formatTimeAgo(dateStr);
      const absoluteDate = new Date(dateStr).toLocaleString();
      return `${timeAgo} (${absoluteDate})`;
    } catch {
      return dateStr;
    }
  };

  const performDelete = async () => {
    try {
      await deleteWork(route.params.workId);
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'UserProfile' }],
      });
      navigation.navigate('UserProfile');
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.message || 'Could not delete work. Please try again.',
      );
    }
  };

  // const handleDeletePress = () => {
  //   if (!isOwner) {
  //     Alert.alert('Not allowed', 'Only the owner of this work can delete it.');
  //     return;
  //   }

  //   Alert.alert(
  //     'Delete work?',
  //     'This will permanently remove your work. This action cannot be undone.',
  //     [
  //       { text: 'Cancel', style: 'cancel' },
  //       {
  //         text: 'Delete',
  //         style: 'destructive',
  //         onPress: performDelete,
  //       },
  //     ],
  //   );
  // };

  const handleUninterestedPress = () => {
    if (!isOwner) {
      Alert.alert('Not allowed', 'Only the owner of this work can delete it.');
      return;
    }

    Alert.alert(
      'Delete work?',
      'This will permanently remove your work. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: performDelete,
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View style={{ height: insets.top }} className="bg-white" />

      {/* Header */}
      <View className="bg-white border-b border-gray-200">
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="flex-row items-center mr-3 p-1.5 rounded-full"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="arrow-back" size={24} color="#111827" />

            <View className="text-2xl font-bold text-gray-900 mx-4">
              <Text className="text-2xl font-bold text-gray-900">
                Work Settings
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
        {isOwner && (
          <View className="bg-white rounded-xl p-4 mb-6 border border-gray-100">
            <View className="flex-row items-center">
              <MaterialIcons name="info-outline" size={20} color="#6B7280" />
              <Text className="text-sm px-3 text-gray-500">
                This action cannot be undone. Once deleted, this item and all of
                its associated data will be permanently removed and cannot be
                recovered
              </Text>
            </View>

            <View className="bg-white border-t border-gray-200 mt-3">
              <TouchableOpacity
                className={`rounded-xl py-4 items-center flex-row justify-center ${
                  deletingWork ? 'bg-red-300' : 'bg-red-600'
                }`}
                activeOpacity={0.8}
                onPress={handleUninterestedPress}
                disabled={isLoading || deletingWork}
              >
                {deletingWork ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons
                      name="delete-outline"
                      size={20}
                      color="#ffffff"
                    />
                    <Text className="ml-2 text-base font-bold text-white">
                      Delete Work
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* {!isOwner && (
          <View className="bg-white rounded-xl p-4 mb-6 border border-gray-100">
            <View className="flex-row items-center">
              <MaterialIcons name="info-outline" size={20} color="#6B7280" />
              <Text className="text-sm px-3 text-gray-500">
                This action cannot be undone. Once deleted, this item and all of
                its associated data will be permanently removed and cannot be
                recovered
              </Text>
            </View>

            <View className="bg-white border-t border-gray-200 mt-3">
              <TouchableOpacity
                className={`rounded-xl py-4 items-center flex-row justify-center ${
                  uninterestedPending ? 'bg-red-300' : 'bg-red-600'
                }`}
                activeOpacity={0.8}
                onPress={handleDeletePress}
                disabled={isLoading || uninterestedPending}
              >
                {uninterestedPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons
                      name="delete-outline"
                      size={20}
                      color="#ffffff"
                    />
                    <Text className="ml-2 text-base font-bold text-white">
                      Remove Interest notice
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )} */}
        {/* Work History Section */}
        <View className="bg-white rounded-xl p-4 mb-6 border border-gray-100">
          <View className="flex-row items-center mb-3 pb-2 border-b border-gray-100">
            <MaterialIcons name="history" size={20} color="#059669" />
            <Text className="text-lg font-bold text-gray-900 ml-2">
              Work History
            </Text>
          </View>

          {historyLoading ? (
            <ActivityIndicator size="small" color="#059669" className="py-4" />
          ) : !history || history.length === 0 ? (
            <Text className="text-sm text-gray-500 py-3 text-center">
              No updates have been made to this work yet.
            </Text>
          ) : (
            <View>
              {history.map((item, index) => (
                <View
                  key={item.id}
                  className={`py-3 border-b border-gray-100 ${
                    index === history.length - 1 ? 'border-b-0 pb-0' : ''
                  }`}
                >
                  <Text className="text-sm font-semibold text-gray-800">
                    Updated {formatFieldName(item.changedField)}
                  </Text>
                  <View className="flex-row items-center flex-wrap mt-1">
                    <Text className="text-xs text-gray-500 line-through">
                      {formatFieldValue(
                        item.changedField,
                        item.oldValue,
                        currencySymbol,
                      )}
                    </Text>
                    <View className="mx-1.5">
                      <MaterialIcons
                        name="arrow-forward"
                        size={12}
                        color="#9CA3AF"
                      />
                    </View>
                    <Text className="text-xs text-emerald-700 font-semibold">
                      {formatFieldValue(
                        item.changedField,
                        item.newValue,
                        currencySymbol,
                      )}
                    </Text>
                  </View>
                  <Text className="text-[10px] text-gray-400 mt-1.5">
                    {formatHistoryTime(item.createdAt)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const formatFieldName = (field: string) => {
  switch (field) {
    case 'title':
      return 'Title';
    case 'description':
      return 'Description';
    case 'category':
      return 'Category';
    case 'budget':
      return 'Budget';
    case 'budgetType':
      return 'Budget Type';
    case 'durationValue':
      return 'Duration Value';
    case 'durationUnit':
      return 'Duration Unit';
    case 'location':
      return 'Location';
    case 'contactPhone':
      return 'Contact Phone';
    case 'status':
      return 'Status';
    case 'scheduledDate':
      return 'Scheduled Date';
    case 'images':
      return 'Work Pictures';
    default:
      return field;
  }
};

const formatFieldValue = (
  field: string,
  val: string | null,
  currencySymbol = '₱',
) => {
  if (val === null || val === 'null' || val === undefined) return 'None';
  if (field === 'budget') return `${currencySymbol}${val}`;
  if (field === 'scheduledDate') {
    try {
      return new Date(val).toLocaleDateString();
    } catch {
      return val;
    }
  }
  if (field === 'images') {
    const count = val.split(',').filter(Boolean).length;
    return `${count} Picture${count === 1 ? '' : 's'}`;
  }
  return val;
};
