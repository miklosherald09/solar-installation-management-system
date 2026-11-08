import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface UserProfileHeaderProps {
  onBackPress: () => void;
  /** When provided, a ⋮ (more) button is rendered on the right — e.g. to open profile settings. */
  onMorePress?: () => void;
  /** When true, shows a settings gear instead of the more button. Calls onSettingsPress. */
  isSelf?: boolean;
  onSettingsPress?: () => void;
}

export function UserProfileHeader({
  onBackPress,
  onMorePress,
  isSelf,
  onSettingsPress,
}: UserProfileHeaderProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="border-b border-gray-100 flex-row justify-between items-center bg-white"
    >
      <View className="flex-row px-4 py-3 items-center flex-1 mr-2">
        <TouchableOpacity
          onPress={onBackPress}
          className="flex-row mr-3 p-1.5 items-center"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <MaterialIcons name="arrow-back" size={24} color="#111827" />
          <View className="mx-4">
            <Text className="text-2xl font-bold text-gray-900">Profile</Text>
          </View>
        </TouchableOpacity>
      </View>

      {isSelf && onSettingsPress ? (
        <TouchableOpacity
          className="w-9 h-9 rounded-full bg-[#006742] items-center justify-center mr-4"
          activeOpacity={0.7}
          accessibilityLabel="Profile settings"
          accessibilityRole="button"
          onPress={onSettingsPress}
        >
          <MaterialIcons name="settings" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      ) : onMorePress ? (
        <TouchableOpacity
          onPress={onMorePress}
          className="p-1.5 rounded-full mr-4"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="More options"
        >
          <MaterialIcons name="more-vert" size={24} color="#111827" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
