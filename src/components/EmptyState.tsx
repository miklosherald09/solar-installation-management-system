/**
 * EmptyState
 * Displays an empty state message with icon
 */

import React from 'react';
import { View, Text } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
}

export function EmptyState({
  title,
  message,
}: EmptyStateProps): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center py-16">
      <MaterialIcons name="air" size={50} color="#006742" />
      <Text className="text-lg font-bold text-gray-800 mb-1">{title}</Text>
      {message && (
        <Text className="text-sm text-gray-500 text-center px-8">
          {message}
        </Text>
      )}
    </View>
  );
}
