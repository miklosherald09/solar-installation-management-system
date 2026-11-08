import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { WorkType } from '../../types';
import { WorkTypeThumb } from '../../components';

interface Props {
  workType: WorkType;
  isSelected: boolean;
  onPress: () => void;
}

export function WorkTypeListItem({ workType, isSelected, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center px-4 py-3 mx-4 mb-2 rounded-xl border ${
        isSelected
          ? 'border-emerald-600 bg-emerald-50'
          : 'border-gray-200 bg-white'
      }`}
      activeOpacity={0.7}
    >
      <WorkTypeThumb workType={workType} borderRadius={5} />
      <View className="flex-1 ml-3">
        <Text className="text-base font-medium text-gray-900">
          {workType.name}
        </Text>
        <Text
          className="text-xs font-thin text-gray-900 mt-0.5"
          numberOfLines={2}
        >
          {workType.description}
        </Text>
      </View>
      {isSelected ? (
        <MaterialIcons name="check-circle" size={22} color="#059669" />
      ) : (
        <MaterialIcons
          name="radio-button-unchecked"
          size={22}
          color="#D1D5DB"
        />
      )}
    </TouchableOpacity>
  );
}
