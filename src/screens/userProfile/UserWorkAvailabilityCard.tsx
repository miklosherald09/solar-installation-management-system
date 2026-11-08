/**
 * UserWorkAvailabilityCard
 * Displays the user's current work availability status in a dedicated section
 * on the UserProfileScreen.
 *
 * If viewing the user's own profile (`isSelf`), the card is pressable and presents
 * the WorkAvailabilitySheet to switch status.
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { getAvailabilityInfo } from '../../components/GlobalAvailabilityBar';
import type { WorkAvailability } from '../../types';

interface Props {
  workAvailability: WorkAvailability;
  isSelf: boolean;
  onPress?: () => void;
}

export function UserWorkAvailabilityCard({
  workAvailability,
  isSelf,
  onPress,
}: Props): React.JSX.Element {
  const info = getAvailabilityInfo(workAvailability);

  const CardWrapper = isSelf && onPress ? TouchableOpacity : View;
  const wrapperProps =
    isSelf && onPress
      ? {
          activeOpacity: 0.75,
          onPress,
          accessibilityRole: 'button' as const,
          accessibilityLabel: `Work availability: ${info.title}. Tap to change status.`,
        }
      : {};

  return (
    <CardWrapper
      {...wrapperProps}
      className="bg-white mt-3 rounded-2xl p-5 border border-gray-200"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 pr-2">
          {/* Status Icon Box */}
          <View
            className="w-8 h-8 rounded-xl items-center justify-center mr-2.5"
            style={{ backgroundColor: `${info.color}18` }}
          >
            <MaterialIcons name={info.icon} size={18} color={info.color} />
          </View>

          <View className="flex-1">
            <Text className="text-base font-bold text-gray-900">
              {info.title}
            </Text>
          </View>
        </View>

        {isSelf && onPress ? (
          <View className="flex-row items-center px-3 py-1.5">
            <MaterialIcons name="edit" size={13} color="#059669" />
            <Text className="text-xs font-semibold text-emerald-700 ml-1">
              Edit
            </Text>
          </View>
        ) : null}
      </View>
    </CardWrapper>
  );
}
