import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuthStore } from '../../store/useAuthStore';

interface Props {
  onEditLocation?: () => void;
}

export function LocationInfoSection({
  onEditLocation,
}: Props): React.JSX.Element {
  const { user } = useAuthStore();

  return (
    <View className="bg-white mx-5 mt-4 rounded-2xl p-5 shadow-sm border border-gray-100">
      <Text className="text-base font-bold text-gray-900 mb-3">
        Your Location
      </Text>
      {onEditLocation ? (
        <TouchableOpacity
          onPress={onEditLocation}
          activeOpacity={0.7}
          className="flex-row items-center justify-between"
        >
          <View className="flex-row items-center flex-1">
            <MaterialIcons name="map" size={20} color="#059669" />
            <View className="px-3 flex-1">
              <Text className="text-sm text-gray-800" numberOfLines={2}>
                {user?.location || 'Set your location'}
              </Text>
            </View>
          </View>
          <MaterialIcons name="edit" size={16} color="#059669" />
        </TouchableOpacity>
      ) : (
        <View className="flex-row items-center">
          <MaterialIcons name="map" size={20} color="#059669" />
          <View className="px-3">
            <Text className="text-sm text-gray-800">
              {user?.location || 'No location set'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
