import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface Props {
  hasUnread: boolean;
  isMarkingAllRead: boolean;
  onBackPress: () => void;
  onMarkAllRead: () => void;
}

export function NotificationsHeader({
  hasUnread,
  isMarkingAllRead,
  onBackPress,
  onMarkAllRead,
}: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="border-b border-gray-100 flex-row justify-between items-center bg-white"
    >
      <View className="flex-row px-4 py-3  items-center flex-1 mr-2">
        <TouchableOpacity
          onPress={onBackPress}
          className="flex-row mr-3 p-1.5 items-center"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="arrow-back" size={24} color="#111827" />
          <View className="mx-4">
            <Text className="text-2xl font-bold text-gray-900">
              Notifications
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {hasUnread && (
        <TouchableOpacity
          onPress={onMarkAllRead}
          disabled={isMarkingAllRead}
          className="px-3 mr-3 py-1.5 rounded-full bg-emerald-50 active:bg-emerald-100 flex-row items-center"
        >
          {isMarkingAllRead ? (
            <ActivityIndicator size="small" color="#059669" />
          ) : (
            <>
              <MaterialIcons name="done-all" size={16} color="#059669" />
              <Text className="text-emerald-700 font-semibold text-xs ml-1">
                Mark all read
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
