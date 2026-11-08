import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Country } from '../../data/countries';
import { CountryCodePicker } from '../../components';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onBlur: () => void;
  country: Country;
  countryIso: string;
  onSelectCountry: (iso: string) => void;
  showError: boolean;
  /** The signed-in user's phone number from the database. */
  userPhone?: string | null;
  /** Fills the input with the user's stored phone number. */
  onUseUserPhone?: () => void;
  ref: any;
}

export function MobileNumberField({
  value,
  onChangeText,
  onBlur,
  country,
  countryIso,
  onSelectCountry,
  showError,
  userPhone,
  onUseUserPhone,
  ref,
}: Props) {
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);

  const clearMobilePhone = () => {
    onChangeText('');
  };

  return (
    <View className="mb-5 mt-6">
      <Text className="text-sm ml-1 font-semibold text-gray-800 mb-2">
        Mobile # <Text className="text-gray-400">(optional)</Text>
      </Text>
      <View
        className={`flex-row items-center bg-white border rounded-xl overflow-hidden ${
          showError ? 'border-red-400' : 'border-gray-200'
        }`}
      >
        <TouchableOpacity
          className="flex-row items-center pl-4 pr-2 border-r border-gray-200"
          activeOpacity={0.7}
          onPress={() => setCountryPickerVisible(true)}
          accessibilityLabel="Select country code"
        >
          <Text className="text-lg mr-1">{country.flagEmoji}</Text>
          <Text className="text-base font-semibold text-gray-500">
            +{country.dialCode}
          </Text>
          <MaterialIcons name="keyboard-arrow-down" size={18} color="#9CA3AF" />
        </TouchableOpacity>
        <TextInput
          ref={ref}
          className="flex-1 py-3.5 pr-4 pl-3 text-base text-gray-900"
          style={Platform.OS === 'android' ? { padding: 0 } : { lineHeight: 0 }}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={country.placeholder || ''}
          placeholderTextColor="#9CA3AF"
          keyboardType="phone-pad"
          autoFocus={false}
          maxLength={country.nationalLength + 5}
        />

        {userPhone && onUseUserPhone && value?.length < 2 ? (
          <TouchableOpacity
            className="pr-3 py-3"
            activeOpacity={0.7}
            onPress={onUseUserPhone}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text className="text-xs font-semibold text-emerald-600">
              Use Number
            </Text>
          </TouchableOpacity>
        ) : null}
        {value?.length > 2 ? (
          <TouchableOpacity
            className="pr-3 py-3"
            activeOpacity={0.7}
            onPress={clearMobilePhone}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <MaterialIcons name="close" size={16} color="#CACAD9" />
          </TouchableOpacity>
        ) : null}
      </View>
      {showError && (
        <Text className="text-xs text-red-500 mt-1 ml-1">
          Enter a valid {country.name} mobile number
        </Text>
      )}

      <CountryCodePicker
        visible={countryPickerVisible}
        selectedIso={countryIso}
        onSelect={c => {
          onSelectCountry(c.iso);
          setCountryPickerVisible(false);
        }}
        onClose={() => setCountryPickerVisible(false)}
      />
    </View>
  );
}
