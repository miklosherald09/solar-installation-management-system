import React from 'react';
import { View } from 'react-native';

export function NotificationSkeleton(): React.JSX.Element {
  return (
    <View className="flex-1 bg-white px-4">
      {[1, 2, 3, 4, 5].map(i => (
        <View
          key={i}
          className="py-5 border-b border-gray-100 flex-row items-start opacity-50"
        >
          <View className="w-9 h-9 rounded-xl bg-gray-100 mr-3" />
          <View className="flex-1 mt-0.5">
            <View className="w-28 h-3.5 bg-gray-250 rounded mb-2" style={{ backgroundColor: '#E5E7EB' }} />
            <View className="w-full h-3 bg-gray-100 rounded mb-1.5" />
            <View className="w-2/3 h-3 bg-gray-100 rounded" />
          </View>
        </View>
      ))}
    </View>
  );
}
