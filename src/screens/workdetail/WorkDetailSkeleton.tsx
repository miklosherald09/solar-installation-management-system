/**
 * WorkDetailSkeleton
 * Pulsing placeholder shown while work details are still being fetched.
 * Mirrors the layout of WorkDetailContent (banner, location, pictures,
 * category, reward card, scheduled-date card, description, tags, poster)
 * plus the bottom action button.
 */

import React from 'react';
import { View, ScrollView } from 'react-native';
import { Skeleton } from '../../components/Skeleton';

export function WorkDetailSkeleton(): React.JSX.Element {
  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* WorkType banner image */}
        <Skeleton className="w-full h-[120px] rounded-xl mb-2" />

        {/* Location line */}
        <View className="flex-row items-center mb-6">
          <View className="my-1 flex-1">
            <Skeleton className="h-4 w-44 rounded mt-1" />
          </View>
          <Skeleton className="h-3.5 w-14 rounded" />
        </View>

        {/* Work pictures */}
        <View className="mb-4">
          <Skeleton className="h-4 w-32 rounded mb-2" />
          <View className="flex-row gap-2">
            <Skeleton className="w-[100px] h-[60px] rounded-lg" />
            <Skeleton className="w-[100px] h-[60px] rounded-lg" />
            <Skeleton className="w-[100px] h-[60px] rounded-lg" />
          </View>
        </View>

        {/* Category badge + relative time */}
        <View className="flex-row items-center justify-between mb-3">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-3.5 w-16 rounded" />
        </View>

        {/* Reward card */}
        <View className="flex-row justify-between rounded-xl bg-white py-4 px-4 mb-4">
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-7 w-24 rounded" />
        </View>

        {/* Scheduled date card */}
        <View className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
          <Skeleton className="h-3.5 w-32 rounded mb-2" />
          <Skeleton className="h-5 w-48 rounded" />
        </View>

        {/* Description card */}
        <View className="bg-white rounded-xl p-4 mb-4">
          <Skeleton className="h-4 w-28 rounded mb-3" />
          <Skeleton className="h-4 w-full rounded mb-2" />
          <Skeleton className="h-4 w-5/6 rounded mb-2" />
          <Skeleton className="h-4 w-2/3 rounded" />
        </View>

        {/* Tags card */}
        <View className="bg-white rounded-xl p-4 mb-4">
          <Skeleton className="h-4 w-20 rounded mb-3" />
          <View className="flex-row flex-wrap gap-2">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </View>
        </View>

        {/* Poster card */}
        <View className="bg-white rounded-xl p-4 mb-6">
          <Skeleton className="h-4 w-24 rounded mb-3" />
          <View className="flex-row items-center">
            <Skeleton className="w-12 h-12 rounded-full mr-3" />
            <View className="flex-1">
              <Skeleton className="h-4 w-1/3 rounded mb-1.5" />
              <Skeleton className="h-3.5 w-1/2 rounded" />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom action button placeholder */}
      <View className="bg-white px-5 py-4">
        <Skeleton className="w-full h-14 rounded-xl" />
      </View>
    </View>
  );
}
