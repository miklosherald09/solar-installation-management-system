import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface UserButtonCardProps {
  isSelf: boolean;
  checkingConvo: boolean;
  onMessagePress: () => void;
  onCallPress?: () => void;
  onRatePress?: () => void;
  canRate?: boolean;
  onCreatePress?: () => void;
}

export function UserButtonCard({
  isSelf,
  checkingConvo,
  onMessagePress,
  onCallPress,
  onRatePress,
  canRate,
}: UserButtonCardProps): React.JSX.Element {
  return (
    <View className="mt-6">
      {!isSelf && (
        <View className="mx-0 w-full flex-row justify-between gap-3">
          <TouchableOpacity
            onPress={onMessagePress}
            disabled={checkingConvo}
            className="flex-1 bg-emerald-50 border border-emerald-300 rounded-xl px-4 h-10 items-center justify-center flex-row"
          >
            {checkingConvo ? (
              <ActivityIndicator size="small" color="#006742" />
            ) : (
              <>
                <MaterialIcons name="chat" size={20} color="#006742" />
                <Text className="text-emerald-900 font-semibold text-base ml-2">
                  Send Message
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onCallPress}
            disabled={!onCallPress}
            className="flex-1 bg-sky-50 border border-sky-300 rounded-xl px-4 h-10 items-center justify-center flex-row"
          >
            <MaterialIcons name="call" size={20} color="#075985" />
            <Text className="text-sky-900 font-semibold text-base ml-2">
              Call
            </Text>
          </TouchableOpacity>

          {canRate && onRatePress && (
            <TouchableOpacity
              onPress={onRatePress}
              className="flex-1 bg-amber-50 border border-amber-300 rounded-xl px-4 h-10 items-center justify-center flex-row"
            >
              <MaterialIcons name="star" size={20} color="#D97706" />
              <Text className="text-amber-900 font-semibold text-base ml-2">
                Rate
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {/* {isSelf && (
        <View className="mx-0 w-full flex-row gap-3">
          <TouchableOpacity
            onPress={onCreatePress}
            className="flex-1 bg-emerald-600 rounded-xl px-4 py-3 items-center justify-center flex-row"
          >
            <Text className="text-white font-semibold text-base ml-2">
              Create New Work
            </Text>
          </TouchableOpacity>
        </View>
      )} */}
    </View>
  );
}
