import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '../../components/Skeleton';

const SKELETON_ROWS = 8;

/**
 * Loading skeleton shown while conversations are being fetched.
 * Mimics the layout of ConversationItem rows (avatar, name, time, message).
 */
export function ConversationListSkeleton() {
  return (
    <View>
      {Array.from({ length: SKELETON_ROWS }).map((_, index) => (
        <View
          key={index}
          className="flex-row items-center px-5 py-3.5 border-b border-gray-100"
        >
          {/* Avatar */}
          <Skeleton className="w-12 h-12 rounded-full mr-3" />

          {/* Content */}
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-1.5">
              <Skeleton className="h-4 w-2/5 rounded" />
              <Skeleton className="h-3 w-12 rounded" />
            </View>
            <Skeleton className="h-3.5 w-4/5 rounded" />
          </View>

          {/* Unread dot */}
          <Skeleton className="w-2.5 h-2.5 rounded-full ml-2" />
        </View>
      ))}
    </View>
  );
}
