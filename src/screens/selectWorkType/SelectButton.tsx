import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface Props {
  enabled: boolean;
  count?: number;
  onPress: () => void;
  bottomInset: number;
}

export function SelectButton({ enabled, count, onPress, bottomInset }: Props) {
  const buttonText = count && count > 1 ? `Select (${count})` : 'Select';

  return (
    <View
      className="bg-white border-t border-gray-200 px-5 py-4"
      style={{ paddingBottom: bottomInset + 16 }}
    >
      <TouchableOpacity
        className={`rounded-xl py-4 items-center ${
          enabled ? 'bg-emerald-600' : 'bg-gray-300'
        }`}
        activeOpacity={0.8}
        onPress={onPress}
        disabled={!enabled}
      >
        <Text className="text-base font-bold text-white">{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
}
