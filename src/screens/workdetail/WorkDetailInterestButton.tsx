import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';

interface Props {
  isOwnWork: boolean;
  applying: boolean;
  hasConversation: boolean;
  partnerName?: string;
  onInterested: () => void;
  onContact: () => void;
}

export function WorkDetailInterestButton({
  isOwnWork,
  applying,
  hasConversation,
  partnerName,
  onInterested,
  onContact,
}: Props) {
  // Only shown when the viewer is not the work creator
  if (isOwnWork) return null;

  const isLoading = hasConversation === undefined;

  return (
    <View className="bg-white px-5 py-4 mb-0">
      {/* "Already Contacted" / "I'm Interested" button */}
      <TouchableOpacity
        className={`rounded-xl py-4 items-center ${
          applying
            ? 'bg-gray-400'
            : hasConversation
            ? 'bg-gray-300'
            : 'bg-emerald-600'
        }`}
        activeOpacity={0.8}
        onPress={onInterested}
        disabled={hasConversation}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : hasConversation ? (
          <Text className="text-base font-bold text-gray-500">
            Already Contacted
          </Text>
        ) : (
          <Text className="text-base font-bold text-white">I'm Interested</Text>
        )}
      </TouchableOpacity>

      {/* "Contact {name}" button — only when a conversation already exists */}
      {hasConversation && partnerName && (
        <TouchableOpacity
          className="rounded-xl py-4 items-center bg-emerald-600 mt-3"
          activeOpacity={0.8}
          onPress={onContact}
        >
          <Text className="text-base font-bold text-white">
            Contact {partnerName}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
