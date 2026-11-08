import React from 'react';
import { View, FlatList, ActivityIndicator } from 'react-native';
import { WorkType } from '../../types';
import { EmptyState } from '../../components';
import { WorkTypeListItem } from './WorkTypeListItem';

interface Props {
  workTypes: WorkType[];
  isLoading: boolean;
  selectedSlugs: Set<string>;
  onToggle: (workType: WorkType) => void;
}

export function WorkTypeList({
  workTypes,
  isLoading,
  selectedSlugs,
  onToggle,
}: Props) {
  return (
    <FlatList
      className="flex-1"
      data={workTypes}
      keyExtractor={item => item.id}
      contentContainerStyle={{ paddingVertical: 12 }}
      renderItem={({ item }) => (
        <WorkTypeListItem
          workType={item}
          isSelected={selectedSlugs.has(item.slug)}
          onPress={() => onToggle(item)}
        />
      )}
      ListEmptyComponent={
        isLoading ? (
          <View className="py-10 items-center">
            <ActivityIndicator size="small" color="#059669" />
          </View>
        ) : (
          <EmptyState
            icon="🧰"
            title="No work types"
            message="No work types are available right now. Try again later."
          />
        )
      }
    />
  );
}
