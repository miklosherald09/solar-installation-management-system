/**
 * UserMobileNumberCard
 * Displays the user's mobile number on their profile.
 * When pressed, it opens the phone dialer to call the number.
 * If empty, displays an empty indicator informing that the user has not set a mobile number.
 */

import React from 'react';
import { View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  getCountryByIso,
  formatNationalDigits,
  toNationalDigits,
  buildE164,
  DEFAULT_COUNTRY,
} from '../../data/countries';

interface Props {
  phone?: string | null;
  phoneCountryCode?: string | null;
  isSelf: boolean;
  onEditPress?: () => void;
}

export function UserMobileNumberCard({
  phone,
  phoneCountryCode,
  isSelf,
  onEditPress,
}: Props): React.JSX.Element {
  const trimmedPhone = phone?.trim();
  const hasPhone = Boolean(trimmedPhone);

  const country =
    getCountryByIso(phoneCountryCode || undefined) ?? DEFAULT_COUNTRY;

  const getDisplayPhone = () => {
    if (!trimmedPhone) return '';
    const nationalDigits = toNationalDigits(trimmedPhone, country);
    const formatted = formatNationalDigits(nationalDigits, country);
    return `${country.flagEmoji} +${country.dialCode} ${formatted}`;
  };

  const handleCall = () => {
    if (!trimmedPhone) {
      Alert.alert(
        'No number',
        isSelf
          ? 'You have not set a mobile number yet.'
          : 'This user has not set a mobile number.',
      );
      return;
    }

    const telUri = buildE164(country, trimmedPhone);
    Linking.openURL(`tel:${telUri}`).catch(() => {
      Alert.alert('Error', 'Could not open the phone dialer.');
    });
  };

  if (!hasPhone) {
    return (
      <View className="bg-white mt-3 rounded-2xl p-5 border border-gray-200">
        {/* Header */}
        <View className="flex-row items-center mb-3">
          <View className="w-8 h-8 rounded-xl bg-gray-100 items-center justify-center mr-2.5">
            <MaterialIcons name="phone-disabled" size={18} color="#9CA3AF" />
          </View>
          <Text className="text-base font-bold text-gray-900">
            Mobile Number
          </Text>
        </View>

        {/* Empty indicator */}
        <View className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-3.5 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 pr-2">
            <MaterialIcons name="info-outline" size={18} color="#9CA3AF" />
            <Text className="text-xs text-gray-500 ml-2 flex-1 leading-4">
              {isSelf
                ? "You haven't set a mobile number yet."
                : 'This user has not set a mobile number.'}
            </Text>
          </View>

          {isSelf && onEditPress && (
            <TouchableOpacity
              onPress={onEditPress}
              activeOpacity={0.7}
              className="px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-200 flex-row items-center"
              accessibilityRole="button"
              accessibilityLabel="Add mobile number"
            >
              <MaterialIcons name="add" size={14} color="#059669" />
              <Text className="text-xs font-semibold text-emerald-700 ml-1">
                Add
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  const displayPhone = getDisplayPhone();

  return (
    <View className="bg-white mt-3 rounded-2xl p-5 border border-gray-200">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3.5">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-xl bg-emerald-50 items-center justify-center mr-2.5">
            <MaterialIcons name="phone" size={18} color="#059669" />
          </View>
          <Text className="text-base font-bold text-gray-900">
            Mobile Number
          </Text>
        </View>
      </View>

      {/* Callable Phone Row */}
      <TouchableOpacity
        onPress={handleCall}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`Call ${displayPhone}`}
        className="flex-row items-center justify-between rounded-xl p-0"
      >
        <View className="flex-1 ml-1 mr-3">
          <Text className="text-base font-semibold text-gray-900 tracking-wide">
            {displayPhone}
          </Text>
        </View>
        <View className="flex-row items-center bg-emerald-600 px-3.5 py-2 rounded-xl shadow-sm">
          <MaterialIcons name="call" size={16} color="#FFFFFF" />
          <Text className="text-white text-xs font-bold ml-1.5">Call</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}
