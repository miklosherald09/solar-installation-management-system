/**
 * SearchBar
 * Search input used by SearchScreen.
 */

import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
  selection?: { start: number; end: number };
  onSelectionChange?: (e: any) => void;
}

export const SearchBar = React.forwardRef<TextInput, SearchBarProps>(
  (
    {
      value,
      onChangeText,
      placeholder = 'Search jobs, services...',
      autoFocus = false,
      onSubmit,
      selection,
      onSelectionChange,
    },
    ref,
  ): React.JSX.Element => {
    return (
      <View className="flex-row items-center bg-gray-100 rounded-xl py-0 px-4">
        <TextInput
          ref={ref}
          className="flex-1 text-base h-10 text-gray-900"
          value={value}
          style={Platform.OS === 'android' ? { padding: 0 } : { lineHeight: 0 }}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          autoFocus={autoFocus}
          selectTextOnFocus={true}
          selection={selection}
          onSelectionChange={onSelectionChange}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => onChangeText('')}
            activeOpacity={0.7}
          >
            <Text className="text-gray-400 text-lg">✕</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  },
);
