/**
 * CountryCodePicker
 * A centered modal for choosing a mobile-number country (dialing code).
 * Searchable by country name or dialing code.
 */

import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  FlatList,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { COUNTRIES, Country } from '../data/countries';

interface Props {
  visible: boolean;
  selectedIso: string;
  onSelect: (country: Country) => void;
  onClose: () => void;
}

export function CountryCodePicker({
  visible,
  selectedIso,
  onSelect,
  onClose,
}: Props): React.JSX.Element {
  const [query, setQuery] = useState('');

  // Sort once; only re-sort/filter based on the search query.
  const sorted = useMemo(
    () => [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      c => c.name.toLowerCase().includes(q) || c.dialCode.includes(q),
    );
  }, [sorted, query]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center px-6">
        <Pressable
          className="absolute inset-0 bg-black/50"
          onPress={onClose}
          accessibilityLabel="Close country picker"
        />

        <View className="w-full h-[70%] bg-white rounded-3xl overflow-hidden">
          {/* Title */}
          <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
            <Text className="text-lg font-bold text-gray-900">
              Select Country
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <MaterialIcons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View className="px-4 pb-2">
            <View className="flex-row items-center bg-gray-100 rounded-xl px-3">
              <MaterialIcons name="search" size={20} color="#9CA3AF" />
              <TextInput
                className="flex-1 py-2.5 pl-2 text-base text-gray-900"
                style={Platform.OS === 'android' ? { padding: 0 } : undefined}
                value={query}
                onChangeText={setQuery}
                placeholder="Search country or dial code"
                placeholderTextColor="#9CA3AF"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* List */}
          <FlatList
            data={filtered}
            keyExtractor={c => c.iso}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            contentContainerStyle={{ paddingBottom: 12 }}
            ListEmptyComponent={
              <View className="py-10 items-center">
                <Text className="text-gray-400">No countries found</Text>
              </View>
            }
            renderItem={({ item }) => {
              const selected = item.iso === selectedIso;
              return (
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={() => {
                    onSelect(item);
                    setQuery('');
                    onClose();
                  }}
                  className="flex-row items-center px-5 py-3"
                >
                  <Text className="text-2xl mr-3">{item.flagEmoji}</Text>
                  <Text className="flex-1 text-base text-gray-900">
                    {item.name}
                  </Text>
                  <Text className="text-base text-gray-500">
                    +{item.dialCode}
                  </Text>
                  {selected && (
                    <MaterialIcons
                      name="check"
                      size={20}
                      color="#059669"
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </TouchableOpacity>
              );
            }}
          />

          {/* Footer note */}
          <View className="border-t border-gray-100 px-5 py-2.5">
            <Text className="text-xs text-gray-400 text-center">
              {COUNTRIES.length} countries available
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
