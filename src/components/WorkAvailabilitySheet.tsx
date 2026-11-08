/**
 * WorkAvailabilitySheet
 * Bottom sheet allowing workers to switch their work availability status
 * between Available for Work, Busy / On a Job, and Off Duty.
 */

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { AppBottomSheetBackdrop } from './AppBottomSheetBackdrop';
import type { WorkAvailability } from '../types';

export interface AvailabilityOption {
  key: WorkAvailability;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  bgLight: string;
  borderActive: string;
}

export const AVAILABILITY_OPTIONS: AvailabilityOption[] = [
  {
    key: 'AVAILABLE',
    title: 'Available for Work',
    subtitle: 'Ready for new job requests and immediate inquiries',
    icon: 'check-circle',
    color: '#10B981', // emerald-500
    bgLight: 'bg-emerald-50',
    borderActive: 'border-emerald-600',
  },
  {
    key: 'BUSY',
    title: 'Busy / On a Job',
    subtitle: 'Occupied right now. Clients know you may reply later',
    icon: 'schedule',
    color: '#F59E0B', // amber-500
    bgLight: 'bg-amber-50',
    borderActive: 'border-amber-600',
  },
  {
    key: 'UNAVAILABLE',
    title: 'Off Duty',
    subtitle: 'Not accepting works right now. Enjoy your break',
    icon: 'do-not-disturb-on',
    color: '#6B7280', // gray-500
    bgLight: 'bg-gray-100',
    borderActive: 'border-gray-200',
  },
];

interface Props {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  currentAvailability: WorkAvailability;
  onSelect: (availability: WorkAvailability) => void;
  isPending?: boolean;
}

export function WorkAvailabilitySheet({
  sheetRef,
  currentAvailability,
  onSelect,
  isPending = false,
}: Props): React.JSX.Element {
  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={['52%']}
      backdropComponent={AppBottomSheetBackdrop}
      enablePanDownToClose={!isPending}
      handleIndicatorStyle={{ backgroundColor: '#D1D5DB', width: 40 }}
    >
      <BottomSheetView className="px-5 pt-2 pb-6">
        {/* Header */}
        <View className="mb-4">
          <Text className="text-lg font-bold text-gray-900">
            Work Availability
          </Text>
          <Text className="text-xs text-gray-500 mt-0.5">
            Let clients and neighbors know if you're ready to take on jobs.
          </Text>
        </View>

        {/* Options */}
        <View className="space-y-2.5">
          {AVAILABILITY_OPTIONS.map(opt => {
            const isSelected = currentAvailability === opt.key;

            return (
              <TouchableOpacity
                key={opt.key}
                activeOpacity={0.7}
                onPress={() => onSelect(opt.key)}
                disabled={isPending}
                className={`flex-row items-center p-4 mb-4 rounded-2xl border ${
                  isSelected
                    ? `${opt.bgLight} ${opt.borderActive}`
                    : 'bg-white border-gray-200'
                }`}
              >
                {/* Icon chip */}
                <View className="w-10 h-10 rounded-xl items-center justify-center mr-3">
                  <MaterialIcons name={opt.icon} size={22} color={opt.color} />
                </View>

                {/* Label + subtitle */}
                <View className="flex-1 pr-2">
                  <Text className="text-sm font-semibold text-gray-900">
                    {opt.title}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    {opt.subtitle}
                  </Text>
                </View>

                {/* Selected check */}
                {isSelected && (
                  <MaterialIcons
                    name="check-circle"
                    size={22}
                    color={opt.color}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {isPending && (
          <View className="flex-row items-center justify-center mt-2">
            <ActivityIndicator size="small" color="#059669" />
            <Text className="text-xs text-gray-400 ml-2">Updating status…</Text>
          </View>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
}
