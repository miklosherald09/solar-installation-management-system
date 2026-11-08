import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { AppBottomSheetBackdrop } from './AppBottomSheetBackdrop';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface ReviewTarget {
  userId: string;
  userName: string;
}

interface UserReviewEntry {
  userId: string;
  rating: number;
  comment: string;
}

interface MultiReviewSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  targets: ReviewTarget[];
  alreadyReviewedMap: Record<string, boolean>;
  onSubmitAll: (reviews: UserReviewEntry[]) => Promise<void>;
  submitting: boolean;
  bottomPad?: number;
}

/**
 * Multi-user review bottom sheet.
 * After work completion, shows a scrollable list of all accepted workers
 * so the poster can rate each one individually (1-5 stars + optional comment).
 */
export function MultiReviewSheet({
  sheetRef,
  targets,
  alreadyReviewedMap,
  onSubmitAll,
  submitting,
  bottomPad = 24,
}: MultiReviewSheetProps): React.JSX.Element {
  const [ratings, setRatings] = React.useState<Record<string, number>>({});
  const [comments, setComments] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    const init: Record<string, number> = {};
    const initComments: Record<string, string> = {};
    for (const t of targets) {
      init[t.userId] = 0;
      initComments[t.userId] = '';
    }
    setRatings(init);
    setComments(initComments);
  }, [targets]);

  const pendingTargets = targets.filter(t => !alreadyReviewedMap[t.userId]);
  const alreadyReviewedTargets = targets.filter(
    t => alreadyReviewedMap[t.userId],
  );

  const allPendingRated = pendingTargets.every(
    t => (ratings[t.userId] || 0) > 0,
  );
  const canSubmit = !submitting && allPendingRated && pendingTargets.length > 0;

  const handleSubmit = async () => {
    const entries: UserReviewEntry[] = pendingTargets.map(t => ({
      userId: t.userId,
      rating: ratings[t.userId] || 0,
      comment: comments[t.userId] || '',
    }));
    await onSubmitAll(entries);
  };

  const setRating = (userId: string, rating: number) =>
    setRatings(prev => ({ ...prev, [userId]: rating }));
  const setComment = (userId: string, comment: string) =>
    setComments(prev => ({ ...prev, [userId]: comment }));

  const ratingLabel = (r: number) => {
    switch (r) {
      case 5:
        return 'Excellent!';
      case 4:
        return 'Great!';
      case 3:
        return 'Good';
      case 2:
        return 'Fair';
      case 1:
        return 'Poor';
      default:
        return '';
    }
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={['70%']}
      backdropComponent={AppBottomSheetBackdrop}
      enablePanDownToClose={!submitting}
      handleIndicatorStyle={{ backgroundColor: '#D1D5DB', width: 40 }}
      keyboardBlurBehavior={Platform.OS === 'ios' ? 'none' : 'restore'}
      keyboardBehavior={
        bottomPad || Platform.OS === 'ios' ? 'interactive' : 'extend'
      }
      android_keyboardInputMode="adjustPan"
    >
      <BottomSheetView
        style={{ paddingBottom: Math.max(bottomPad, 24) }}
        className="px-5 pt-2"
      >
        <Text className="text-lg font-bold text-gray-900 mb-2">
          Rate Workers
        </Text>
        <Text className="text-sm text-gray-500 mb-4">
          Rate each accepted worker for this completed work.
        </Text>

        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingBottom: 8 }}
        >
          {alreadyReviewedTargets.map(target => (
            <View
              key={target.userId}
              className="bg-gray-50 rounded-xl p-3 border border-gray-200"
            >
              <View className="flex-row items-center">
                <MaterialIcons name="check-circle" size={20} color="#059669" />
                <Text className="text-sm font-semibold text-gray-500 ml-2">
                  {target.userName}
                </Text>
                <Text className="text-xs text-gray-400 ml-auto">Reviewed</Text>
              </View>
            </View>
          ))}

          {pendingTargets.map(target => {
            const r = ratings[target.userId] || 0;
            return (
              <View
                key={target.userId}
                className="bg-white rounded-xl p-3 border border-gray-200"
              >
                <Text className="text-sm font-semibold text-gray-800 mb-2">
                  {target.userName}
                </Text>
                <View className="flex-row justify-center mb-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setRating(target.userId, star)}
                      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                      className="px-1"
                    >
                      <MaterialIcons
                        name={star <= r ? 'star' : 'star-outline'}
                        size={28}
                        color={star <= r ? '#F59E0B' : '#D1D5DB'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                {r > 0 && (
                  <Text className="text-center text-xs text-gray-500 mb-2">
                    {ratingLabel(r)}
                  </Text>
                )}
                <View className="border mt-2 border-gray-200 rounded-lg">
                  <BottomSheetTextInput
                    className="px-3 py-2 text-sm text-gray-900"
                    style={
                      Platform.OS === 'android'
                        ? { padding: 0 }
                        : { lineHeight: 0 }
                    }
                    value={comments[target.userId] || ''}
                    onChangeText={t => setComment(target.userId, t)}
                    placeholder="Comment (optional)..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    maxLength={200}
                  />
                </View>
              </View>
            );
          })}

          {pendingTargets.length > 0 && (
            <TouchableOpacity
              className={`rounded-xl py-3.5 items-center ${
                canSubmit ? 'bg-emerald-600' : 'bg-gray-300'
              }`}
              activeOpacity={0.8}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text className="text-base font-bold text-white">
                  Submit All Reviews
                </Text>
              )}
            </TouchableOpacity>
          )}
        </BottomSheetScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
