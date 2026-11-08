import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface Props {
  onBackPress: () => void;
}

export function ProfileHeader({ onBackPress }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="bg-white border-b border-gray-100"
    >
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity
          onPress={onBackPress}
          className="flex-row items-center mr-3 p-1.5 rounded-full"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="arrow-back" size={24} color="#111827" />
          <View className="flex-1 mx-4">
            <Text className="text-2xl font-bold text-gray-900">
              Profile Settings
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
