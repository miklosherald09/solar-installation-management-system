/**
 * UserProfileSkeleton
 * Pulsing placeholder shown while the user profile is still loading.
 * Mirrors the layout of UserProfileScreen (header, hero card, buttons,
 * works grid) plus the bottom action button when applicable.
 */

import React from 'react';
import { View, ScrollView } from 'react-native';
import { Skeleton } from '../../components/Skeleton';

export function UserProfileSkeleton(): React.JSX.Element {
  return (
    <View className="flex-1 bg-gray-50">
      {/* ── Header ── */}
      <View className="bg-white border-b border-gray-200">
        <View className="h-11" />
        <View className="flex-row items-center px-4 py-3">
          <Skeleton className="h-5 w-5 rounded mr-3" />
          <Skeleton className="h-7 w-20 rounded" />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Card ── */}
        <View className="bg-white mt-4 rounded-2xl p-6 shadow-sm">
          <View className="flex-row">
            {/* Avatar */}
            <Skeleton
              className="w-20 h-20 rounded-full"
              style={{ width: 88, height: 88, borderRadius: 44 }}
            />
            <View className="ml-4 flex-1 mt-3">
              {/* Name */}
              <Skeleton className="h-6 w-3/4 rounded mb-2" />
              {/* Email */}
              <Skeleton className="h-3.5 w-1/2 rounded mb-2" />
              {/* Credibility badge */}
              <Skeleton className="h-5 w-40 rounded" />
            </View>
          </View>
        </View>

        {/* ── Button Card ── */}
        <View className="bg-white mt-4 rounded-2xl py-4 px-6 shadow-sm">
          <View className="flex-row gap-3">
            {/* Message button */}
            <Skeleton className="w-36 h-10 rounded-xl" />
            {/* Rate button */}
            <Skeleton className="w-36 h-10 rounded-xl" />
          </View>
        </View>

        {/* ── Works section label ── */}
        <View className="flex-row items-center justify-between mt-6 mb-2">
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-3.5 w-12 rounded" />
        </View>

        {/* ── Works grid (2 columns, 3 rows) ── */}
        {[0, 1, 2].map(row => (
          <View key={row} className="flex-row gap-3 mb-4">
            <View className="flex-1 bg-white rounded-xl overflow-hidden shadow-sm">
              <Skeleton className="w-full h-24 rounded-t-xl" />
              <View className="p-2">
                <Skeleton className="h-4 w-3/4 rounded mb-1" />
                <Skeleton className="h-3.5 w-1/2 rounded mb-1" />
                <Skeleton className="h-3.5 w-2/3 rounded" />
              </View>
            </View>
            <View className="flex-1 bg-white rounded-xl overflow-hidden shadow-sm">
              <Skeleton className="w-full h-24 rounded-t-xl" />
              <View className="p-2">
                <Skeleton className="h-4 w-3/4 rounded mb-1" />
                <Skeleton className="h-3.5 w-1/2 rounded mb-1" />
                <Skeleton className="h-3.5 w-2/3 rounded" />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ── Bottom accept-applicant button (conditional) ── */}
      <View className="bg-white border-t border-gray-100 px-5 py-4">
        <Skeleton className="w-full h-14 rounded-xl" />
      </View>
    </View>
  );
}