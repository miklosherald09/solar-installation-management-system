import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PostWorkNav } from './types';

interface Props {
  location: string;
  navigation: PostWorkNav;
}

export function LocationField({ location, navigation }: Props) {
  return (
    <View className="mt-2">
      {/* <Text className="text-2xl font-semibold text-gray-800 mb-2">Where?</Text> */}
      <TouchableOpacity
        className="bg-white rounded-xl flex-row items-center"
        activeOpacity={0.7}
        onPress={() => navigation.navigate('UpdateLocation')}
      >
        <MaterialIcons name="location-on" size={20} color="#059669" />
        <Text
          className={`ml-1 text-xs flex-1 ${
            location ? 'text-gray-900' : 'text-gray-400'
          }`}
          numberOfLines={1}
        >
          {location || 'Tap to set location'}
        </Text>
        <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  );
}
