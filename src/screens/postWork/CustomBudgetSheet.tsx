import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';

interface Props {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  snapPoints: string[];
  backdropComponent: any;
  customAmount: string;
  currencySymbol?: string;
  onChangeText: (text: string) => void;
  onConfirm: () => void;
}

export function CustomBudgetSheet({
  sheetRef,
  snapPoints,
  backdropComponent,
  customAmount,
  currencySymbol = '₱',
  onChangeText,
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
      keyboardBehavior={Platform.OS === 'ios' ? 'interactive' : 'extend'}
      keyboardBlurBehavior={Platform.OS === 'ios' ? 'none' : 'restore'}
      android_keyboardInputMode="adjustPan"
    >
      <BottomSheetView>
        <View
          style={{ paddingBottom: Math.max(bottomPad, 24) }}
          className="px-5 pt-4"
        >
          <Text className="text-lg font-bold text-gray-900 mb-4">
            Enter Custom Amount
          </Text>

          <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3.5 mb-4">
            <Text className="text-base font-semibold text-gray-700 mr-2">
              {currencySymbol}
            </Text>
            <BottomSheetTextInput
              className="flex-1 text-base text-gray-900"
              style={
                Platform.OS === 'android' ? { padding: 0 } : { lineHeight: 0 }
              }
              autoFocus={true}
              value={customAmount}
              onChangeText={onChangeText}
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>

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
