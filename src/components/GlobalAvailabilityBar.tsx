/**
 * GlobalAvailabilityBar
 * A top-of-screen indicator component allowing users to see and change
 * their work availability status (Available for Work, Busy, Off Duty)
 * from anywhere in the app.
 */

import React, { useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/useAuthStore';
import { useUpdateWorkAvailability } from '../hooks/useWorkAvailability';
import {
  WorkAvailabilitySheet,
  AVAILABILITY_OPTIONS,
} from './WorkAvailabilitySheet';
import type { WorkAvailability } from '../types';

export function getAvailabilityInfo(status?: WorkAvailability) {
  const current = status || 'AVAILABLE';
  return (
    AVAILABILITY_OPTIONS.find(o => o.key === current) ?? AVAILABILITY_OPTIONS[0]
  );
}

interface Props {
  /** Visual variant: 'pill' (compact floating pill) or 'banner' (full-width strip) */
  variant?: 'pill' | 'banner';
  /** If true, uses shorter labels suitable for dense headers ("Available", "Busy", "Off Duty") */
  compact?: boolean;
  /** If true, automatically adds top safe-area inset padding */
  useSafeArea?: boolean;
  className?: string;
  style?: any;
}

export function GlobalAvailabilityBar({
  variant = 'pill',
  compact = false,
  useSafeArea = false,
  className = '',
  style,
}: Props): React.JSX.Element | null {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuthStore();
  const sheetRef = useRef<BottomSheetModal>(null);

  const { mutate: updateAvailability, isPending } =
    useUpdateWorkAvailability();

  const currentAvailability: WorkAvailability =
    user?.workAvailability || 'AVAILABLE';
  const info = getAvailabilityInfo(currentAvailability);

  const handleOpenSheet = useCallback(() => {
    sheetRef.current?.present();
  }, []);

  const handleSelectAvailability = useCallback(
    (newStatus: WorkAvailability) => {
      updateAvailability(newStatus, {
        onSettled: () => {
          sheetRef.current?.dismiss();
        },
      });
    },
    [updateAvailability],
  );

  // Hidden for unauthenticated/guest sessions
  if (!isAuthenticated || !user) {
    return null;
  }

  const containerPaddingTop = useSafeArea ? insets.top : 0;
  const label = compact
    ? currentAvailability === 'AVAILABLE'
      ? 'Available'
      : currentAvailability === 'BUSY'
      ? 'Busy'
      : 'Off Duty'
    : info.title;

  if (variant === 'banner') {
    return (
      <>
        <View
          style={[{ paddingTop: containerPaddingTop }, style]}
          className={`bg-white/95 border-b border-gray-100 px-4 py-2 flex-row items-center justify-between ${className}`}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleOpenSheet}
            className="flex-row items-center flex-1"
            accessibilityRole="button"
            accessibilityLabel={`Change work availability, currently ${info.title}`}
          >
            {/* Status dot with pulsing effect ring */}
            <View className="relative mr-2.5 items-center justify-center">
              <View
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: info.color }}
              />
              <View
                className="absolute rounded-full border opacity-40"
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  borderColor: info.color,
                }}
              />
            </View>

            <View className="flex-row items-center">
              <Text className="text-xs font-medium text-gray-400 mr-1.5">
                Work Status:
              </Text>
              <Text
                className="text-xs font-bold text-gray-800 mr-1"
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleOpenSheet}
            className="flex-row items-center px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200/70"
          >
            <Text className="text-[11px] font-semibold text-gray-600 mr-0.5">
              Change
            </Text>
            <MaterialIcons
              name="keyboard-arrow-down"
              size={14}
              color="#6B7280"
            />
          </TouchableOpacity>
        </View>

        {/* Bottom Sheet */}
        <WorkAvailabilitySheet
          sheetRef={sheetRef}
          currentAvailability={currentAvailability}
          onSelect={handleSelectAvailability}
          isPending={isPending}
        />
      </>
    );
  }

  // Pill variant (sleek floating pill)
  return (
    <>
      <View
        style={[{ paddingTop: containerPaddingTop }, style]}
        className={`items-center justify-center ${className}`}
      >
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={handleOpenSheet}
          className="flex-row items-center bg-white px-2.5 py-1.5 rounded-full border border-gray-200/80 shadow-sm"
          accessibilityRole="button"
          accessibilityLabel={`Change work availability, currently ${info.title}`}
        >
          {/* Status Dot */}
          <View className="relative mr-1.5 items-center justify-center">
            <View
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: info.color }}
            />
            <View
              className="absolute rounded-full border opacity-30"
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                borderColor: info.color,
              }}
            />
          </View>

          {/* Status Label */}
          <Text className="text-[11px] font-semibold text-gray-700 mr-0.5">
            {label}
          </Text>

          {/* Chevron */}
          <MaterialIcons
            name="keyboard-arrow-down"
            size={14}
            color="#9CA3AF"
          />
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet */}
      <WorkAvailabilitySheet
        sheetRef={sheetRef}
        currentAvailability={currentAvailability}
        onSelect={handleSelectAvailability}
        isPending={isPending}
      />
    </>
  );
}
