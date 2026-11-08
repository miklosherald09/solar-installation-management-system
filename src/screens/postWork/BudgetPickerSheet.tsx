import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { PRESET_AMOUNTS } from './constants';
import { BudgetType } from './types';

interface Props {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  snapPoints: string[];
  backdropComponent: any;
  budgetType: BudgetType;
  setBudgetType: (v: BudgetType) => void;
  selectedBudget: string;
  setSelectedBudget: (v: string) => void;
  currencySymbol?: string;
  onCustom: () => void;
  onConfirm: () => void;
}

export function BudgetPickerSheet({
  sheetRef,
  snapPoints,
  backdropComponent,
  budgetType,
  setBudgetType,
  selectedBudget,
  setSelectedBudget,
  currencySymbol = '₱',
  onCustom,
  onConfirm,
}: Props) {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'android' ? insets.bottom : 0;

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      backdropComponent={backdropComponent}
      enablePanDownToClose
    >
      <BottomSheetView>
        <View
          style={{ paddingBottom: Math.max(bottomPad, 24) }}
          className="px-5 pt-4"
        >
          <Text className="text-lg font-bold text-gray-900 mb-4">
            Select Budget
          </Text>

          {/* Budget type selector at the top */}
          <View className="flex-row mb-4 w-48">
            {(['fixed', 'negotiable'] as const).map(type => (
              <TouchableOpacity
                key={type}
                className={`flex-1 py-2.5 rounded-full border ${
                  budgetType === type
                    ? 'border-emerald-600 bg-emerald-600'
                    : 'border-gray-300 bg-white'
                } ${type === 'fixed' ? 'mr-2' : ''}`}
                activeOpacity={0.7}
                onPress={() => setBudgetType(type)}
              >
                <Text
                  className={`text-sm font-semibold text-center capitalize ${
                    budgetType === type ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {PRESET_AMOUNTS.map(amount => (
            <TouchableOpacity
              key={amount}
              className={`py-3.5 rounded-xl mb-2 border ${
                Number(selectedBudget) === amount
                  ? 'border-emerald-600 bg-emerald-50'
                  : 'border-gray-200 bg-white'
              }`}
              activeOpacity={0.7}
              onPress={() => setSelectedBudget(String(amount))}
            >
              <Text
                className={`text-lg font-semibold text-center ${
                  Number(selectedBudget) === amount
                    ? 'text-emerald-700'
                    : 'text-gray-900'
                }`}
              >
                {currencySymbol}
                {amount.toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Custom amount button */}
          <TouchableOpacity
            className="py-3.5 rounded-xl mb-6 border border-gray-200 bg-white"
            activeOpacity={0.7}
            onPress={onCustom}
          >
            <Text className="text-lg font-semibold text-center text-gray-700">
              Custom Amount
            </Text>
          </TouchableOpacity>

          {/* Select button */}
          <TouchableOpacity
            className="bg-emerald-600 rounded-xl py-3.5 items-center"
            activeOpacity={0.8}
            onPress={onConfirm}
          >
            <Text className="text-base font-bold text-white">Select</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
