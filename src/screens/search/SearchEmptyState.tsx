/**
 * SearchEmptyState
 * Empty states for the search results list.
 */

import React from 'react';
import { View, Text } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface SearchEmptyStateProps {
  hasQuery: boolean;
}

export function SearchEmptyState({
  hasQuery,
}: SearchEmptyStateProps): React.JSX.Element {
  if (hasQuery) {
    return (
      <View className="items-center justify-center py-20">
        <MaterialIcons name="search-off" size={50} color="#006742" />
        <Text className="text-base font-semibold text-gray-500 mb-1">
          No users found
        </Text>
        <Text className="text-sm text-gray-400 text-center px-10">
          Try a different name
        </Text>
      </View>
    );
  }

  return (
    <View className="items-center justify-center py-20">
      <MaterialIcons name="search" size={50} color="#006742" />
      <Text className="text-base font-semibold text-gray-500 mb-1">
        Search for people
      </Text>
      <Text className="text-sm text-gray-400 text-center px-10">
        Type a name above to find people on Solar Installation Management System
      </Text>
    </View>
  );
}
