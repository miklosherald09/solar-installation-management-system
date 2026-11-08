/**
 * UserCapableWorkTypesCard
 * Displays all services / capable work types a user can perform.
 * Rendered on UserProfileScreen as a rich, modern capability card.
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useWorkTypes } from '../../hooks';
import { getCategoryInfo, workTypeToCategoryInfo } from '../../constants';
import { WorkCategory } from '../../types';

interface Props {
  capableWorkTypes?: string[];
  isSelf: boolean;
  onEditPress?: () => void;
}

export function UserCapableWorkTypesCard({
  capableWorkTypes = [],
  isSelf,
  onEditPress,
}: Props): React.JSX.Element | null {
  const { data: workTypes } = useWorkTypes();

  // If user has no capable work types and is not viewing their own profile, hide section
  if (capableWorkTypes.length === 0 && !isSelf) {
    return null;
  }

  return (
    <View className="bg-white mt-3 rounded-2xl p-5 border border-gray-200">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3.5">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-xl bg-emerald-50 items-center justify-center mr-2.5">
            <MaterialIcons name="handyman" size={18} color="#059669" />
          </View>
          <View>
            <Text className="text-base font-bold text-gray-900">
              Capable Works
            </Text>
          </View>
        </View>

        {isSelf && onEditPress && (
          <TouchableOpacity
            onPress={onEditPress}
            className="flex-row items-center  px-3 py-1.5"
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Edit capable services"
          >
            <MaterialIcons name="edit" size={13} color="#059669" />
            <Text className="text-xs font-semibold text-emerald-700 ml-1">
              Edit
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Skills Grid / Empty State */}
      {capableWorkTypes.length === 0 ? (
        isSelf ? (
          <TouchableOpacity
            onPress={onEditPress}
            className="bg-emerald-50/50 border border-dashed border-emerald-300 rounded-xl p-4 items-center justify-center flex-row"
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="add-circle-outline"
              size={22}
              color="#059669"
            />
            <View className="ml-2.5">
              <Text className="text-xs font-bold text-emerald-800">
                Add Services You Can Perform
              </Text>
              <Text className="text-[11px] text-emerald-600/80 mt-0.5">
                Let homeowners and clients know your skills
              </Text>
            </View>
          </TouchableOpacity>
        ) : null
      ) : (
        <View className="flex-row flex-wrap mt-0 ml-1">
          {capableWorkTypes.map(slug => {
            const matchedWorkType = workTypes?.find(wt => wt.slug === slug);
            const category = workTypeToCategoryInfo(
              matchedWorkType,
              getCategoryInfo(slug as WorkCategory),
            );

            return (
              <View
                key={slug}
                className="flex-row items-center rounded-xl mr-4 mb-2"
              >
                <View className="h-7 rounded-lg items-center justify-center mr-1.5">
                  <MaterialIcons
                    name={category.icon || 'work'}
                    size={16}
                    color={category.color || '#059669'}
                  />
                </View>
                <Text className="text-sm font-semibold text-gray-800">
                  {category.label}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
