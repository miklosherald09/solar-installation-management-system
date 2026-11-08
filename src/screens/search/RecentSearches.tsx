/**
 * RecentSearches
 * Displays the user's recent search queries as tappable chips.
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { SearchLogItem } from '../../services/searchService';

interface RecentSearchesProps {
  items: SearchLogItem[];
  onItemPress: (query: string) => void;
  onEditPress: () => void;
}

export function RecentSearches({
  items,
  onItemPress,
  onEditPress,
}: RecentSearchesProps): React.JSX.Element {
  return (
    <View className="pt-2 pb-2">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs font-semibold text-gray-400 ml-1">
          RECENT SEARCHES
        </Text>
        <TouchableOpacity
          className="flex-row items-center"
          activeOpacity={0.6}
          onPress={onEditPress}
        >
          <Text className="text-xs font-medium text-emerald-600 mr-1">
            Edit
          </Text>
          <MaterialIcons name="chevron-right" size={16} color="#059669" />
        </TouchableOpacity>
      </View>
      <View className="flex-row flex-wrap">
        {items.map(item => (
          <TouchableOpacity
            key={item.id}
            className="flex-row items-center bg-gray-100 rounded-full px-3 py-2 mr-2 mb-2"
            activeOpacity={0.6}
            onPress={() => onItemPress(item.query)}
          >
            <MaterialIcons
              name="history"
              size={14}
              color="#9CA3AF"
              style={{ marginRight: 6 }}
            />
            <Text className="text-sm text-gray-700" numberOfLines={1}>
              {item.query}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
