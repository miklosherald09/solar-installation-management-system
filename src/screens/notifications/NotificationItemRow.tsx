import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { NotificationItem } from '../../types';
import { formatTimeAgo } from '../../utils';
import { GroupedNotification } from './types';

interface Props {
  item: GroupedNotification;
  onPress: (notification: NotificationItem, groupedIds: string[]) => void;
}

export function NotificationItemRow({
  item,
  onPress,
}: Props): React.JSX.Element {
  const { item: notification, groupedIds } = item;

  // Determine icon and color based on notification type
  let iconName = 'notifications-none';
  let iconBg = 'bg-gray-55';
  let iconColor = '#6B7280'; // gray-500

  if (notification.type === 'new_message') {
    iconName = 'chat-bubble-outline';
    iconBg = 'bg-blue-50';
    iconColor = '#3B82F6'; // blue-500
  } else if (notification.type === 'new_interest') {
    iconName = 'work-outline';
    iconBg = 'bg-emerald-50';
    iconColor = '#10B981'; // emerald-500
  } else if (notification.type === 'work_updated') {
    iconName = 'notifications-none';
    iconBg = 'bg-amber-50';
    iconColor = '#F59E0B'; // amber-500
  } else if (notification.type === 'new_work') {
    iconName = 'work';
    iconBg = 'bg-violet-50';
    iconColor = '#8B5CF6'; // violet-500
  } else if (notification.type === 'pro_badge') {
    iconName = 'verified';
    iconBg = 'bg-emerald-50';
    iconColor = '#059669'; // emerald-600
  }

  // Adjust bg-gray-55 to bg-gray-50
  if (iconBg === 'bg-gray-55') {
    iconBg = 'bg-gray-55';
  }
  // Wait, let's just make it bg-gray-50 directly
  const iconWrapperBg = iconBg === 'bg-gray-55' ? 'bg-gray-50' : iconBg;

  return (
    <TouchableOpacity
      onPress={() => onPress(notification, groupedIds)}
      className="flex-row items-start py-2 px-5 border-b border-gray-100 relative"
      style={
        !notification.read
          ? { backgroundColor: '#F9FAFB' }
          : { backgroundColor: '#FFFFFF' }
      }
      activeOpacity={0.6}
    >
      {/* Unread indicator vertical bar */}
      {!notification.read && (
        <View className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-600" />
      )}

      {/* Icon wrapper */}
      <View
        className={`w-9 h-9 rounded-xl items-center justify-center ${iconWrapperBg} mr-3 mt-0.5`}
      >
        <MaterialIcons name={iconName} size={18} color={iconColor} />
      </View>

      {/* Content wrapper */}
      <View className="flex-1 pr-2">
        <View className="flex-row justify-between items-baseline mb-1">
          <Text
            numberOfLines={1}
            className={`text-sm flex-1 mr-2 text-gray-900 ${
              notification.read ? 'font-medium' : 'font-semibold'
            }`}
          >
            {notification.title}
          </Text>
          <Text className="text-xs text-gray-400 font-normal">
            {formatTimeAgo(notification.createdAt)}
          </Text>
        </View>
        <Text
          numberOfLines={2}
          className={`text-xs leading-5 ${
            notification.read ? 'text-gray-400' : 'text-gray-600'
          }`}
        >
          {notification.body}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
