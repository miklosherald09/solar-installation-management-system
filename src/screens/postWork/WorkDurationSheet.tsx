import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { DURATION_UNITS } from './constants';
import { WorkDurationUnit } from '../../types';

interface Props {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  snapPoints: string[];
  backdropComponent: any;
  value: string;
  onChangeValue: (v: string) => void;
  unit: WorkDurationUnit;
  onChangeUnit: (v: WorkDurationUnit) => void;
  onConfirm: () => void;
  showClear: boolean;
  onClear: () => void;
}

export function WorkDurationSheet({
  sheetRef,
  snapPoints,
  backdropComponent,
  value,
  onChangeValue,
  unit,
  onChangeUnit,
  onConfirm,
  showClear,
  onClear,
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
    >
      <BottomSheetView>
        <View
          style={{ paddingBottom: Math.max(bottomPad, 24) }}
          className="px-5 pt-4"
        >
          <Text className="text-lg font-bold text-gray-900">Work Duration</Text>
          <Text className="text-sm text-gray-900 mb-4">
            Enter how long you think the work will last
          </Text>

          {/* Duration value input */}
          <View className="flex-row items-center bg-gray-100 rounded-xl px-4 mb-4">
            <MaterialIcons name="schedule" size={20} color="#059669" />
            <BottomSheetTextInput
              className="flex-1 py-3.5 px-4 text-lg font-semibold text-gray-900"
              style={
                Platform.OS === 'android' ? { padding: 0 } : { lineHeight: 0 }
              }
              value={value}
              onChangeText={onChangeValue}
              placeholder="0"
              autoFocus={true}
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
            />
          </View>

          <View className="flex-row flex-wrap mb-6">
            {DURATION_UNITS.map(unitOption => (
              <TouchableOpacity
                key={unitOption.value}
                className={`px-4 py-2.5 rounded-full border mr-2 mb-2 ${
                  unit === unitOption.value
                    ? 'border-emerald-600 bg-emerald-600'
                    : 'border-gray-300 bg-white'
                }`}
                activeOpacity={0.7}
                onPress={() => onChangeUnit(unitOption.value)}
              >
                <Text
                  className={`text-sm font-semibold ${
                    unit === unitOption.value ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  {unitOption.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Set duration */}
          <TouchableOpacity
            className="bg-emerald-600 rounded-xl py-3.5 items-center"
            activeOpacity={0.8}
            onPress={onConfirm}
          >
            <Text className="text-base font-bold text-white">Set Duration</Text>
          </TouchableOpacity>

          {/* Clear */}
          {showClear && (
            <TouchableOpacity
              className="py-3 items-center mt-2"
              activeOpacity={0.7}
              onPress={onClear}
            >
              <Text className="text-sm font-semibold text-red-500">
                Clear duration
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
