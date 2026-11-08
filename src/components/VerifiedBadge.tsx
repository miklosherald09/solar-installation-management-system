/**
 * VerifiedBadge
 * Displays an official "Verified Pro" trust badge (shield/checkmark).
 *
 * Can be rendered as an icon-only badge (for compact cards like WorkCard)
 * or as a pill/chip with label (for profiles like UserProfileHeroCard).
 */

import React from 'react';
import { View, Text } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface VerifiedBadgeProps {
  /** Icon size in dp (default 16) */
  size?: number;
  /** Whether to render a pill with the text label (default false) */
  showLabel?: boolean;
  /** Text label when showLabel is true (default "Verified Pro") */
  label?: string;
  /** Primary accent color (default #059669 - emerald-600) */
  color?: string;
}

export function VerifiedBadge({
  size = 16,
  showLabel = false,
  label = 'Verified Pro',
  color = '#059669',
}: VerifiedBadgeProps): React.JSX.Element {
  if (showLabel) {
    return (
      <View
        className="flex-row items-center bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"
        accessibilityLabel={label}
        accessibilityRole="text"
      >
        <MaterialIcons name="verified" size={size} color={color} />
        <Text className="text-xs font-semibold text-emerald-700 ml-1">
          {label}
        </Text>
      </View>
    );
  }

  return (
    <View
      className="items-center justify-center"
      accessibilityLabel={label}
      accessibilityRole="image"
    >
      <MaterialIcons name="verified" size={size} color={color} />
    </View>
  );
}
