import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export interface MenuItem {
  /** MaterialIcons icon name */
  icon: string;
  label: string;
  subtitle: string;
  onPress?: () => void;
}

interface Props {
  items: MenuItem[];
}

export function ProfileMenuItems({ items }: Props): React.JSX.Element {
  return (
    <View className="bg-white mx-5 mt-4 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {items.map((item, index) => (
        <TouchableOpacity
          key={`${item.label}-${index}`}
          className={`flex-row items-center px-5 py-4 ${
            index < items.length - 1 ? 'border-b border-gray-100' : ''
          }`}
          activeOpacity={0.6}
          onPress={item.onPress}
        >
          <MaterialIcons name={item.icon} size={22} color="#059669" />
          <View className="ml-3 flex-1">
            <Text className="text-base text-emerald-700 font-medium">
              {item.label}
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              {item.subtitle}
            </Text>
          </View>
          <Text className="text-gray-400 text-lg">›</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
