import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface Props {
  onBack: () => void;
}

export function SelectWorkTypeHeader({ onBack }: Props) {
  return (
    <View className="flex-row items-center px-3 py-3 bg-white border-b border-gray-200">
      <TouchableOpacity
        onPress={onBack}
        className="mr-2 p-2"
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <MaterialIcons name="arrow-back" size={24} color="#111827" />
      </TouchableOpacity>
      <Text className="text-lg font-bold text-gray-900">Select Work Type</Text>
    </View>
  );
}
