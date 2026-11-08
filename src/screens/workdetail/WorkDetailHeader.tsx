import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface WorkDetailHeaderProps {
  /** Whether the signed-in user owns this work (shows the "more" button). */
  isOwnWork?: boolean;
  /** Called when the owner taps the "more" button (opens Work Settings). */
  onMorePress?: () => void;
}

export function WorkDetailHeader({ onMorePress }: WorkDetailHeaderProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View>
      <View style={{ paddingTop: insets.top }} className="bg-white" />
      <View className="bg-white border-b border-gray-200">
        <View className="flex-row justify-between items-center px-4 py-3">
          <View className="flex-1">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="flex-row items-center mr-3 p-1.5 rounded-full"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="arrow-back" size={24} color="#111827" />
              <View className="flex-1 mx-4">
                <Text className="text-2xl font-bold text-gray-900">
                  Work Details
                </Text>
              </View>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={onMorePress}
            className="p-1.5 rounded-full"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Work settings"
            accessibilityRole="button"
          >
            <MaterialIcons name="more-vert" size={24} color="#111827" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
