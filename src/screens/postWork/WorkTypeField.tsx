import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { WorkType } from '../../types';
import { WorkTypeThumb } from '../../components';

interface Props {
  selectedWorkTypes?: WorkType[];
  selectedWorkType?: WorkType;
  onPress: () => void;
}

export function WorkTypeField({
  selectedWorkTypes,
  selectedWorkType,
  onPress,
}: Props) {
  const types =
    selectedWorkTypes && selectedWorkTypes.length > 0
      ? selectedWorkTypes
      : selectedWorkType
      ? [selectedWorkType]
      : [];

  return (
    <View className="mb-5">
      <TouchableOpacity
        className="bg-white border border-gray-200 rounded-xl px-4 py-3.5"
        activeOpacity={0.7}
        onPress={onPress}
      >
        {types.length === 1 ? (
          <View className="flex-row items-center">
            <WorkTypeThumb workType={types[0]} size={44} />
            <Text className="ml-2.5 text-base text-gray-900 flex-1 font-medium">
              {types[0].name}
            </Text>
            <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
          </View>
        ) : types.length > 1 ? (
          <View className="flex-row items-center">
            <WorkTypeThumb workType={types[0]} size={44} />
            <View className="ml-2.5 flex-1">
              <View className="flex-row items-center flex-wrap">
                {types.map(wt => (
                  <View
                    key={wt.id}
                    className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md mr-1.5 my-0.5"
                  >
                    <Text className="text-xs font-semibold text-emerald-800">
                      {wt.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
          </View>
        ) : (
          <View className="flex-row items-center">
            <Text className="text-base text-gray-400 flex-1">
              Select work type(s)
            </Text>
            <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}
