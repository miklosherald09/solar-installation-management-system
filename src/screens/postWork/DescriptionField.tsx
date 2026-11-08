import React from 'react';
import { View, TextInput } from 'react-native';
// import { Text } from 'react-native-paper';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  ref: any;
}

export function DescriptionField({ value, onChangeText, ref }: Props) {
  return (
    <View className="mt-0">
      <TextInput
        className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900"
        value={value}
        onChangeText={onChangeText}
        placeholder="Work / project description"
        placeholderTextColor="#9CA3AF"
        multiline
        numberOfLines={4}
        ref={ref}
        textAlignVertical="top"
        style={{ minHeight: 100 }}
      />
    </View>
  );
}
