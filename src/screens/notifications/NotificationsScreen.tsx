import React from 'react';
import { FlatList, View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuthStore } from '../../store/useAuthStore';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../../hooks/useNotifications';
import { NotificationsStackParamList, NotificationItem } from '../../types';
import { LoginPrompt } from '../messages/LoginPrompt';
import { NotificationsHeader } from './NotificationsHeader';
import { GroupedNotification } from './types';
import { NotificationItemRow } from './NotificationItemRow';
import { NotificationSkeleton } from './NotificationSkeleton';
import { NotificationsEmptyState } from './NotificationsEmptyState';

type NotificationsNav = NativeStackNavigationProp<
  NotificationsStackParamList,
  'Notifications'
>;

function groupNotifications(items: NotificationItem[]): GroupedNotification[] {
  const grouped: { [key: string]: NotificationItem[] } = {};
  const result: GroupedNotification[] = [];

  for (const item of items) {
    let key = item.id;
    const payload = item.data;
    if (
      (item.type === 'new_message' || item.type === 'new_interest') &&
      payload?.conversationId
    ) {
      key = `convo_${payload.conversationId}`;
    } else if (
      (item.type === 'work_updated' || item.type === 'new_work') &&
      payload?.workId
    ) {
      key = `work_${payload.workId}`;
    }

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  }

  const processedKeys = new Set<string>();

  for (const item of items) {
    let key = item.id;
    const payload = item.data;
    if (
      (item.type === 'new_message' || item.type === 'new_interest') &&
      payload?.conversationId
    ) {
      key = `convo_${payload.conversationId}`;
    } else if (
      (item.type === 'work_updated' || item.type === 'new_work') &&
      payload?.workId
    ) {
      key = `work_${payload.workId}`;
    }

    if (processedKeys.has(key)) {
      continue;
    }
    processedKeys.add(key);

    const group = grouped[key];
    if (group.length === 1) {
      result.push({
        item: group[0],
        groupedIds: [group[0].id],
      });
    } else {
      const latest = group[0];
      const unreadCount = group.filter(n => !n.read).length;
      const allRead = unreadCount === 0;

      let mergedTitle = latest.title;
      let mergedBody = latest.body;

      if (latest.type === 'new_message' || latest.type === 'new_interest') {
        const partner = latest.data?.partnerName || 'Someone';
        if (unreadCount > 1) {
          mergedTitle = `${partner} (${unreadCount} new messages)`;
        } else {
          mergedTitle = `${partner} (${group.length} messages)`;
        }
      } else if (latest.type === 'work_updated') {
        if (group.length > 1) {
          mergedTitle = `${latest.title} (${group.length} updates)`;
        }
      }

      result.push({
        item: {
          ...latest,
          title: mergedTitle,
          body: mergedBody,
          read: allRead,
        },
        groupedIds: group.map(n => n.id),
      });
    }
  }

  return result;
}

export function NotificationsScreen(): React.JSX.Element {
  const navigation = useNavigation<NotificationsNav>();
  const { user, isAuthenticated } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = React.useState(false);

  const {
    data: notifications,
    isLoading,
    isError,
    refetch,
  } = useNotifications();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  // Re-fetch notifications when screen is focused
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (isAuthenticated && user?.id) {
        refetch();
      }
    });
    return unsubscribe;
  }, [navigation, isAuthenticated, user?.id, refetch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const displayNotifications = React.useMemo(() => {
    return groupNotifications(notifications ?? []);
  }, [notifications]);

  const handleNotificationPress = async (
    item: NotificationItem,
    groupedIds: string[],
  ) => {
    // 1. Mark all unread notifications in this group as read in background
    const hasUnreadInGroup = groupedIds.some(id => {
      const original = notifications?.find(n => n.id === id);
      return original && !original.read;
    });

    if (hasUnreadInGroup) {
      markReadMutation.mutate(groupedIds.join(','));
    }

    // 2. Navigate based on type of the latest item
    const payload = item.data;
    if (item.type === 'new_message' || item.type === 'new_interest') {
      if (payload?.conversationId) {
        // The showed notification group's newest item may be a plain
        // 'new_message' whose payload has no workId (only the original
        // 'new_interest' carries it). Fall back to any group member that has
        // one so the Work Info card in the conversation header still renders.
        const workId =
          payload.workId ||
          groupedIds
            .map(id => notifications?.find(n => n.id === id))
            .find(n => n?.data?.workId)?.data?.workId;

        navigation.navigate('ConversationDetail', {
          conversationId: payload.conversationId,
          partnerName: payload.partnerName || 'Chat',
          partnerPhoto: payload.partnerPhoto || null,
          partnerId: payload.partnerId || '',
          workId,
        });
      }
    } else if (item.type === 'work_updated' || item.type === 'new_work') {
      if (payload?.workId) {
        navigation.navigate('WorkDetail', {
          workId: payload.workId,
        });
      }
    }
  };

  const hasUnread = React.useMemo(() => {
    return notifications?.some(n => !n.read) ?? false;
  }, [notifications]);

  // ---------------------------------------------------------------------------
  // Not authenticated – show login prompt
  // ---------------------------------------------------------------------------
  if (!isAuthenticated || !user?.id) {
    return (
      <LoginPrompt
        topInset={insets.top}
        headerTitle="Notifications"
        iconName="notifications-none"
        subtitle="Sign in with your Google account to view and manage your notifications."
      />
    );
  }

  return (
    <View className="flex-1 bg-white">
      <NotificationsHeader
        hasUnread={hasUnread}
        isMarkingAllRead={markAllReadMutation.isPending}
        onBackPress={() => navigation.goBack()}
        onMarkAllRead={() => markAllReadMutation.mutate()}
      />

      {/* Content */}
      {isLoading ? (
        <NotificationSkeleton />
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-6 bg-gray-50">
          <MaterialIcons name="error-outline" size={48} color="#9CA3AF" />
          <Text className="text-base text-gray-500 text-center mt-3">
            Could not load notifications. Pull down to refresh.
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            className="mt-4 px-4 py-2 bg-emerald-700 rounded-full active:opacity-90"
          >
            <Text className="text-white font-semibold text-sm">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={displayNotifications}
          keyExtractor={item => item.item.id}
          contentContainerStyle={{
            paddingBottom: 32,
          }}
          className="bg-white"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#006742']}
              tintColor="#006742"
            />
          }
          ListEmptyComponent={<NotificationsEmptyState />}
          renderItem={({ item }) => (
            <NotificationItemRow
              item={item}
              onPress={handleNotificationPress}
            />
          )}
        />
      )}
    </View>
  );
}
