import React from 'react';
import { View, Text } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export function NotificationsEmptyState(): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center py-28 px-8 bg-white">
      <MaterialIcons
        name="notifications-none"
        size={36}
        color="#D1D5DB"
      />
      <Text className="text-base font-semibold text-gray-400 mt-4 text-center">
        All caught up
      </Text>
      <Text className="text-xs text-gray-300 text-center mt-1 max-w-[240px] leading-4">
        We'll let you know when something new arrives.
      </Text>
    </View>
  );
}
