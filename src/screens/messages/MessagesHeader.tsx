import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface Props {
  /** Top safe-area inset. */
  topInset?: number;
  /** Show a back arrow when provided / handler. */
  onBack?: () => void;
  onBackPress?: () => void;
  /** Optional subtitle shown under the title. */
  subtitle?: string;
  /** Optional header title (defaults to "Messages"). */
  title?: string;
}

/**
 * Header for the messages screen.
 * Follows the NotificationsHeader layout and structure.
 */
export function MessagesHeader({
  topInset,
  onBack,
  onBackPress,
  title = 'Messages',
}: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const top = topInset ?? insets.top;
  const handleBack = onBackPress ?? onBack;

  return (
    <View
      style={{ paddingTop: top }}
      className="border-b border-gray-100 flex-row justify-between items-center bg-white"
    >
      <View className="flex-row px-4 py-3 items-center flex-1 mr-2">
        <TouchableOpacity
          onPress={handleBack}
          className="flex-row mr-3 p-1.5 items-center"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <MaterialIcons name="arrow-back" size={24} color="#111827" />
          <View className="mx-4">
            <Text className="text-2xl font-bold text-gray-900">{title}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
