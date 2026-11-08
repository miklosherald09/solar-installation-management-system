import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BudgetType } from './types';

interface Props {
  budget: string;
  budgetType: BudgetType;
  currencySymbol?: string;
  onPress: () => void;
}

export function BudgetField({
  budget,
  budgetType,
  currencySymbol = '₱',
  onPress,
}: Props) {
  const budgetDisplay = budget
    ? `${currencySymbol}${Number(budget).toLocaleString()}`
    : `${currencySymbol}0`;

  return (
    <View className="mb-5 p-1">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-2xl font-semibold text-gray-800">
          Budget <Text className="text-red-500">*</Text>
        </Text>
        <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
          <Text className="text-2xl font-semibold text-emerald-600">
            {budgetDisplay}
          </Text>
        </TouchableOpacity>
      </View>
      <View className="ml-1, -mt-2">
        <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
          <Text className="text-base text-gray-500 capitalize">
            {budgetType}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
