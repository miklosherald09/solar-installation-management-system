import React from 'react';
import { View, Text } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface CredibilityBadgeProps {
  rating: number; // 0-5, e.g. 4.5
  reviewCount: number;
  completedWorks?: number; // optional total works completed
  compact?: boolean; // smaller variant for cards
  showWorks?: boolean; // whether to show "X works"
}

/**
 * A star-rating badge that shows a user's credibility.
 * Displays filled/half/empty stars, the numeric rating, and review count.
 *
 * Compact variant shows just stars + rating number for tight spaces (e.g. WorkCard).
 */
export function CredibilityBadge({
  rating,
  reviewCount,
  completedWorks,
  compact = false,
  showWorks = false,
}: CredibilityBadgeProps): React.JSX.Element {
  // Round to nearest 0.5 for half-star rendering
  const roundedRating = Math.round(rating * 2) / 2;

  const stars: ('filled' | 'half' | 'empty')[] = [];
  for (let i = 1; i <= 5; i++) {
    if (roundedRating >= i) {
      stars.push('filled');
    } else if (roundedRating >= i - 0.5) {
      stars.push('half');
    } else {
      stars.push('empty');
    }
  }

  if (compact) {
    return (
      <View className="flex-row items-center">
        {reviewCount > 0 ? (
          <>
            <MaterialIcons name="star" size={12} color="#F59E0B" />
            <Text className="text-xs text-gray-600 ml-0.5 font-medium">
              {rating > 0 ? rating.toFixed(1) : '-'}
            </Text>
            {completedWorks != null && showWorks && (
              <Text className="text-xs text-gray-400 ml-1">
                · {completedWorks} works
              </Text>
            )}
          </>
        ) : (
          <Text className="text-xs text-gray-400">No reviews yet</Text>
        )}
      </View>
    );
  }

  return (
    <View>
      <View className="flex-row items-center gap-1">
        {/* Stars */}
        <View className="flex-row items-center">
          {stars.map((type, i) => {
            if (type === 'filled') {
              return (
                <MaterialIcons key={i} name="star" size={16} color="#F59E0B" />
              );
            }
            if (type === 'half') {
              return (
                <MaterialIcons
                  key={i}
                  name="star-half"
                  size={16}
                  color="#F59E0B"
                />
              );
            }
            return (
              <MaterialIcons
                key={i}
                name="star-outline"
                size={16}
                color="#D1D5DB"
              />
            );
          })}
        </View>

        {/* Numeric rating */}
        {reviewCount > 0 ? (
          <Text className="text-sm font-semibold text-gray-700 ml-1">
            {rating.toFixed(1)}
          </Text>
        ) : null}

        {/* Review count */}
        {reviewCount > 0 ? (
          <Text className="text-xs text-gray-400 ml-0.5">({reviewCount})</Text>
        ) : (
          <Text className="text-xs text-gray-400 ml-1">No reviews yet</Text>
        )}
      </View>
      {/* Completed works */}
      {completedWorks != null && showWorks && (
        <Text className="text-xs text-gray-400 mt-1">
          {completedWorks} work{completedWorks !== 1 ? 's' : ''} completed
        </Text>
      )}
    </View>
  );
}
