import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface Props {
  display: string;
  onPress: () => void;
}

export function DurationField({ display, onPress }: Props) {
  return (
    <View className="mb-5">
      <Text className="text-sm font-semibold text-gray-800 mb-2">
        How long will it take? <Text className="text-gray-400">(optional)</Text>
      </Text>
      <TouchableOpacity
        className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 flex-row items-center"
        activeOpacity={0.7}
        onPress={onPress}
      >
        <MaterialIcons name="schedule" size={20} color="#059669" />
        <Text
          className={`ml-2 text-base flex-1 ${
            display ? 'text-gray-900' : 'text-gray-400'
          }`}
          numberOfLines={1}
        >
          {display || 'Set work duration (optional)'}
        </Text>
        <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  );
}
