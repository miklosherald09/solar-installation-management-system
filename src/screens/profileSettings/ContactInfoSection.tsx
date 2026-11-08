import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { getCountryByIso, formatNationalDigits } from '../../data/countries';

interface Props {
  email: string;
  phone?: string | null;
  phoneCountryCode?: string | null;
  onEditPhone?: () => void;
}

export function ContactInfoSection({
  email,
  phone,
  phoneCountryCode,
  onEditPhone,
}: Props): React.JSX.Element {
  const getFormattedPhone = () => {
    if (!phone) return '';
    if (!phoneCountryCode) return phone;
    const country = getCountryByIso(phoneCountryCode);
    if (!country) return phone;
    return `+${country.dialCode} ${formatNationalDigits(phone, country)}`;
  };

  const formattedPhone = getFormattedPhone();

  return (
    <View className="bg-white mx-5 mt-4 rounded-2xl p-5 shadow-sm border border-gray-100">
      <Text className="text-base font-bold text-gray-900 mb-3">
        Contact Info
      </Text>

      {/* Email */}
      <View className="flex-row items-center mb-3">
        <MaterialIcons name="email" size={20} color="#059669" />
        <View className="ml-3">
          <Text className="text-xs text-emerald-700">Email</Text>
          <Text className="text-sm text-gray-800">{email}</Text>
        </View>
      </View>

      {/* Phone */}
      {onEditPhone ? (
        <TouchableOpacity
          onPress={onEditPhone}
          activeOpacity={0.7}
          className="flex-row items-center mt-3 pt-3 border-t border-gray-100"
        >
          <MaterialIcons name="phone" size={20} color="#059669" />
          <View className="ml-3 flex-1">
            <Text className="text-xs text-emerald-700">Phone</Text>
            <Text className="text-sm text-gray-800">
              {formattedPhone || 'Add phone number'}
            </Text>
          </View>
          <MaterialIcons name="edit" size={16} color="#059669" />
        </TouchableOpacity>
      ) : (
        <View className="flex-row items-center mt-3 pt-3 border-t border-gray-100">
          <MaterialIcons name="phone" size={20} color="#059669" />
          <View className="ml-3">
            <Text className="text-xs text-emerald-700">Phone</Text>
            <Text className="text-sm text-gray-800">
              {formattedPhone || 'Not provided'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
