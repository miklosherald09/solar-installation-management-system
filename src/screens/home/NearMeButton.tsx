import React from 'react';
import { View, TouchableOpacity } from 'react-native';

interface NearMeFilter {
  latitude: number;
  longitude: number;
  rangeKm: number;
  conciseLocation?: string;
  location?: string;
}

interface Props {
  onNearMePress: () => void;
  nearMeFilter?: NearMeFilter;
  onClearNearMe?: () => void;
}

export function NearMeButton({
  onNearMePress,
  nearMeFilter,
}: // onClearNearMe,
Props) {
  if (!nearMeFilter) {
    return null;
  }

  return (
    <TouchableOpacity
      className="relative bg-red-700 -top-4"
      onPress={onNearMePress}
      activeOpacity={0.7}
    >
      <View className="pl-0 mb-0 flex-row items-center justify-between rounded-xl">
        <View className="flex-row items-center w-2/3">
          {/* <MaterialIcons name="near-me" size={16} color="#006742" /> */}
          {/* <Text className="ml-1.5 text-xs font-semibold text-gray-400">
                    {nearMeFilter.conciseLocation || nearMeFilter.location}
                    {' • '}
                    {nearMeFilter.rangeKm} km
                  </Text> */}
          {/* <Text className="ml-1 text-xs text-emerald-600">
                  · {filteredWorks.length} work
                  {filteredWorks.length !== 1 ? 's' : ''}
                </Text> */}
        </View>
        {/* <TouchableOpacity
                onPress={onClearNearMe}
                className="flex-row items-center bg-white rounded-full px-2.5 py-1 border border-emerald-200"
              >
                <Text className="text-xs font-medium text-emerald-700 mr-1">
                  Clear
                </Text>
                <MaterialIcons name="close" size={14} color="#006742" />
              </TouchableOpacity> */}
      </View>
    </TouchableOpacity>
  );
}
