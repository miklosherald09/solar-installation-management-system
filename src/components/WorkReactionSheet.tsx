import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBottomSheetBackdrop } from './AppBottomSheetBackdrop';

export interface ReactionOption {
  emoji: string;
  label: string;
  description: string;
}

export const WORK_REACTIONS: ReactionOption[] = [
  { emoji: '👍', label: 'Like', description: 'Thumbs up' },
  { emoji: '❤️', label: 'Love', description: 'Great opportunity' },
  { emoji: '🔥', label: 'Fire', description: 'Hot listing' },
  { emoji: '👏', label: 'Applaud', description: 'Well done' },
  { emoji: '🎉', label: 'Celebrate', description: 'Exciting work' },
  { emoji: '😮', label: 'Wow', description: 'Impressive' },
  { emoji: '💡', label: 'Insightful', description: 'Smart idea' },
  { emoji: '🤝', label: 'Helpful', description: 'Great initiative' },
];

interface WorkReactionSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  selectedReaction?: string | null;
  onSelectReaction: (reaction: string) => void;
}

export function WorkReactionSheet({
  sheetRef,
  selectedReaction,
  onSelectReaction,
}: WorkReactionSheetProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(() => ['54%'], []);

  const renderBackdrop = useCallback(
    (props: any) => <AppBottomSheetBackdrop {...props} />,
    [],
  );

  const handleSelect = (emoji: string) => {
    sheetRef.current?.dismiss();
    onSelectReaction(emoji);
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      handleIndicatorStyle={{ backgroundColor: '#D1D5DB', width: 40 }}
    >
      <BottomSheetView
        style={{
          paddingBottom:
            Platform.OS === 'android'
              ? Math.max(insets.bottom, 20)
              : Math.max(insets.bottom, 16),
        }}
      >
        {/* Header */}
        <View className="px-5 pt-2 pb-3 border-b border-gray-100 flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-bold text-gray-900">Reactions</Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              Choose an emoticon to react to this work
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => sheetRef.current?.dismiss()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <MaterialIcons name="close" size={22} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Reaction options list */}
        <View className="py-2 px-3">
          <View className="flex-row flex-wrap justify-between">
            {WORK_REACTIONS.map(item => {
              const isSelected = selectedReaction === item.emoji;

              return (
                <TouchableOpacity
                  key={item.emoji}
                  onPress={() => handleSelect(item.emoji)}
                  activeOpacity={0.7}
                  className={`w-[48%] flex-row items-center p-3 mb-2 rounded-2xl border ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/70'
                      : 'border-gray-100 bg-gray-50 active:bg-gray-100'
                  }`}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label} reaction`}
                >
                  <Text className="text-2xl mr-3">{item.emoji}</Text>
                  <View className="flex-1">
                    <Text
                      className={`text-sm font-semibold ${
                        isSelected ? 'text-emerald-900' : 'text-gray-800'
                      }`}
                    >
                      {item.label}
                    </Text>
                    <Text
                      className="text-[10px] text-gray-400"
                      numberOfLines={1}
                    >
                      {item.description}
                    </Text>
                  </View>
                  {isSelected && (
                    <MaterialIcons
                      name="check-circle"
                      size={16}
                      color="#059669"
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
