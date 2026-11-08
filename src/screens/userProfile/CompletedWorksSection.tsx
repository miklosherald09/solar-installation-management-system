/**
 * CompletedWorksSection
 * Horizontal list of a user's completed works, shown within UserProfileScreen.
 */

import React from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Work } from '../../types';
import { WorkCardSm } from '../../components/WorkCardSm';

interface Props {
  completedWorks?: Work[];
  completedWorksLoading: boolean;
}

export function CompletedWorksSection({
  completedWorks,
  completedWorksLoading,
}: Props): React.JSX.Element {
  const navigation = useNavigation<any>();

  return (
    <View className="mt-6 mb-1">
      <View className="flex-row items-center justify-between px-1 mb-2.5">
        <View className="flex-row items-center">
          <MaterialIcons name="task-alt" size={18} color="#059669" />
          <Text className="text-base font-bold text-gray-900 ml-1.5">
            Completed Works
          </Text>
        </View>
        <Text className="text-xs text-gray-400">
          {completedWorks?.length ?? 0} total
        </Text>
      </View>

      {completedWorksLoading ? (
        <View className="py-6 items-center justify-center bg-white rounded-2xl border border-gray-200">
          <ActivityIndicator size="small" color="#059669" />
        </View>
      ) : completedWorks && completedWorks.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingVertical: 2 }}
        >
          {completedWorks.map(item => (
            <View key={item.id} style={{ width: 180 }}>
              <WorkCardSm
                work={item}
                compact
                onPress={() =>
                  navigation.navigate('WorkDetail', { workId: item.id })
                }
                compactAspectRatio={1.4}
              />
            </View>
          ))}
        </ScrollView>
      ) : (
        <View className="bg-white rounded-2xl p-4 border border-gray-200 items-center justify-center py-5">
          <MaterialIcons
            name="assignment-turned-in"
            size={24}
            color="#9CA3AF"
          />
          <Text className="text-xs font-semibold text-gray-500 mt-1.5">
            No completed works yet
          </Text>
        </View>
      )}
    </View>
  );
}
