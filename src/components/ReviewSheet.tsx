import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { AppBottomSheetBackdrop } from './AppBottomSheetBackdrop';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface ReviewSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  targetUserName: string;
  existingRating: number;
  existingComment: string;
  onRatingChange: (rating: number) => void;
  onCommentChange: (comment: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  alreadyReviewed: boolean;
  bottomPad?: number;
}

/**
 * Bottom sheet that lets a user rate another user (1-5 stars)
 * and optionally leave a comment. Used after work completion.
 */
export function ReviewSheet({
  sheetRef,
  targetUserName,
  existingRating,
  existingComment,
  onRatingChange,
  onCommentChange,
  onSubmit,
  submitting,
  alreadyReviewed,
  bottomPad = 24,
}: ReviewSheetProps): React.JSX.Element {
  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={[360]}
      backdropComponent={AppBottomSheetBackdrop}
      enablePanDownToClose={!submitting}
      handleIndicatorStyle={{ backgroundColor: '#D1D5DB', width: 40 }}
    >
      <BottomSheetView
        style={{ paddingBottom: Math.max(bottomPad, 24) }}
        className="px-5 pt-2"
      >
        <Text className="text-lg font-bold text-gray-900 mb-4">
          {alreadyReviewed
            ? 'Review Submitted'
            : `Rate ${targetUserName || 'Partner'}`}
        </Text>

        {alreadyReviewed ? (
          <View className="items-center py-6">
            <MaterialIcons name="check-circle" size={48} color="#059669" />
            <Text className="text-base text-gray-600 mt-3 text-center">
              You have already reviewed this user for this work.
            </Text>
          </View>
        ) : (
          <>
            {/* Star selector */}
            <View className="flex-row justify-center mb-4">
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity
                  key={star}
                  onPress={() => onRatingChange(star)}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  className="px-1"
                  accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}
                >
                  <MaterialIcons
                    name={star <= existingRating ? 'star' : 'star-outline'}
                    size={36}
                    color={star <= existingRating ? '#F59E0B' : '#D1D5DB'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {existingRating > 0 && (
              <Text className="text-center text-sm text-gray-500 mb-4">
                {existingRating === 5
                  ? 'Excellent! ⭐'
                  : existingRating === 4
                  ? 'Great! 👍'
                  : existingRating === 3
                  ? 'Good 🙂'
                  : existingRating === 2
                  ? 'Fair 😐'
                  : 'Poor 😞'}
              </Text>
            )}

            {/* Comment input */}
            <View className="bg-white border border-gray-200 rounded-xl mb-4">
              <BottomSheetTextInput
                className="px-4 py-3 text-base text-gray-900"
                style={{ minHeight: 60, textAlignVertical: 'top' }}
                value={existingComment}
                onChangeText={onCommentChange}
                placeholder="Write a comment (optional)..."
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={500}
              />
            </View>
            {existingComment.length > 0 && (
              <Text className="text-xs text-gray-400 -mt-2 mb-3 text-right">
                {existingComment.length}/500
              </Text>
            )}

            {/* Submit button */}
            <TouchableOpacity
              className={`rounded-xl py-3.5 items-center ${
                existingRating > 0 && !submitting
                  ? 'bg-emerald-600'
                  : 'bg-gray-300'
              }`}
              activeOpacity={0.8}
              onPress={onSubmit}
              disabled={existingRating === 0 || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-base font-bold text-white">
                  Submit Review
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
}