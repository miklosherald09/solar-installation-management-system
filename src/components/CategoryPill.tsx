/**
 * CategoryPill
 * Horizontal scrollable category selector pill
 */

import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { CategoryInfo } from '../types';

interface CategoryPillProps {
  category: CategoryInfo;
  isSelected: boolean;
  onPress: () => void;
}

export function CategoryPill({
  category,
  isSelected,
  onPress,
}: CategoryPillProps): React.JSX.Element {
  return (
    <TouchableOpacity
      className={`flex-row items-center px-4 py-2.5 rounded-full mr-2.5 border ${
        isSelected ? 'border-transparent' : 'border-gray-200'
      }`}
      style={
        isSelected
          ? { backgroundColor: category.color }
          : { backgroundColor: '#FFFFFF' }
      }
      activeOpacity={0.7}
      onPress={onPress}
    >
      <MaterialIcons
        name={category.icon}
        size={18}
        color={isSelected ? '#FFFFFF' : category.color}
        style={{ marginRight: 6 }}
      />
      <Text
        className={`text-sm font-semibold ${
          isSelected ? 'text-white' : 'text-gray-700'
        }`}
      >
        {category.label}
      </Text>
    </TouchableOpacity>
  );
}
