/**
 * SearchUserRow
 * Displays a single user result row in people search.
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { UserSummary } from '../../services/userService';
import { maskEmail } from '../../utils';

interface SearchUserRowProps {
  user: UserSummary;
  onPress: (user: UserSummary) => void;
}

export function SearchUserRow({
  user,
  onPress,
}: SearchUserRowProps): React.JSX.Element {
  return (
    <TouchableOpacity
      className="flex-row items-center py-3 px-1 border-b border-gray-100"
      activeOpacity={0.6}
      onPress={() => onPress(user)}
    >
      {user.photo ? (
        <Image
          source={{ uri: user.photo }}
          className="w-11 h-11 rounded-full bg-gray-200"
        />
      ) : (
        <View className="w-11 h-11 rounded-full bg-emerald-100 items-center justify-center">
          <Text className="text-base font-bold text-emerald-600">
            {(user.name || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View className="flex-1 ml-3">
        <Text
          className="text-base font-semibold text-gray-800"
          numberOfLines={1}
        >
          {user.name}
        </Text>
        <View className="flex-row items-center mt-0.5">
          {user.distance ? (
            <Text className="text-xs text-emerald-700 font-semibold mr-1.5">
              {user.distance}
            </Text>
          ) : null}
          {user.email ? (
            <Text className="text-xs text-gray-400 flex-1" numberOfLines={1}>
              {user.distance
                ? `· ${maskEmail(user.email)}`
                : maskEmail(user.email)}
            </Text>
          ) : null}
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={20} color="#D1D5DB" />
    </TouchableOpacity>
  );
}
