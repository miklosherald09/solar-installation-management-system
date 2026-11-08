import React from 'react';
import { View, Text } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

/**
 * Shown when the user has no conversations yet.
 */
export function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <MaterialIcons name="chat-bubble-outline" size={48} color="#D1D5DB" />
      <Text className="text-base text-gray-400 mt-4">No conversations yet</Text>
      <Text className="text-sm text-gray-300 mt-1">
        Express interest in a work to start chatting!
      </Text>
    </View>
  );
}
