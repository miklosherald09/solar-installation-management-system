/**
 * RecentSearchesScreen
 * View and manage all search history — delete individual entries.
 */

import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuthStore } from '../store/useAuthStore';
import { useAllSearches, useDeleteSearchLog } from '../hooks/useSearchLogs';
import { EmptyState } from '../components/EmptyState';
import { HomeStackParamList } from '../types';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'RecentSearches'>;

export function RecentSearchesScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const userId = user?.id;

  const { data: items } = useAllSearches(userId);
  const deleteMutation = useDeleteSearchLog();

  const handleDelete = (id: string) => {
    if (userId) {
      deleteMutation.mutate({ id, userId });
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View style={{ height: insets.top }} className="bg-white" />

      {/* Header */}
      <View className="bg-white px-4 pb-4 flex-row items-center">
        <TouchableOpacity
          className="w-9 h-9 items-center justify-center mr-2"
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Recent Searches</Text>
      </View>

      <FlatList
        data={items ?? []}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}
        renderItem={({ item }) => (
          <View className="mx-5 mb-2 bg-white rounded-xl px-4 py-3 flex-row items-center">
            <MaterialIcons
              name="history"
              size={20}
              color="#9CA3AF"
              style={{ marginRight: 12 }}
            />
            <View className="flex-1">
              <Text className="text-sm text-gray-800">{item.query}</Text>
              <Text className="text-xs text-gray-400 mt-0.5">
                {new Date(item.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <TouchableOpacity
              className="w-8 h-8 items-center justify-center"
              onPress={() => handleDelete(item.id)}
              activeOpacity={0.6}
            >
              <MaterialIcons name="close" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="🕐"
            title="No search history"
            message="Your recent searches will appear here"
          />
        }
      />
    </View>
  );
}
