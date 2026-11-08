import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { AppBottomSheetBackdrop } from '../../components';
import { getInitials } from '../conversation/helpers';

interface MessageComposerSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  user: any;
  messageText: string;
  setMessageText: (text: string) => void;
  sendingMessage: boolean;
  onSendMessage: () => void;
  composerHeight: number;
  handleComposerSizeChange: (e: any) => void;
}

export function MessageComposerSheet({
  sheetRef,
  user,
  messageText,
  setMessageText,
  sendingMessage,
  onSendMessage,
  composerHeight,
  handleComposerSizeChange,
}: MessageComposerSheetProps): React.JSX.Element {
  const renderBackdrop = React.useCallback(
    (props: any) => <AppBottomSheetBackdrop {...props} />,
    [],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={['46%']}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      enableOverDrag={false}
      keyboardBehavior={Platform.OS === 'ios' ? 'interactive' : 'extend'}
      keyboardBlurBehavior={Platform.OS === 'ios' ? 'none' : 'restore'}
      backgroundStyle={{ backgroundColor: '#FFFFFF' }}
      handleIndicatorStyle={{ backgroundColor: '#D1D5DB' }}
    >
      <BottomSheetView className="px-5 pt-2 pb-6">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center flex-1 mr-3">
            <View className="w-9 h-9 rounded-full bg-emerald-100 items-center justify-center overflow-hidden mr-2.5">
              {user?.photo ? (
                <Image
                  source={{ uri: user.photo }}
                  style={{ width: 36, height: 36 }}
                  className="bg-gray-200"
                />
              ) : (
                <Text className="text-sm font-bold text-emerald-600">
                  {getInitials(user?.name || '?')}
                </Text>
              )}
            </View>
            <View className="flex-1">
              <Text
                className="text-base font-bold text-gray-900 leading-5"
                numberOfLines={1}
              >
                New message
              </Text>
              <Text
                className="text-xs text-gray-500 leading-4"
                numberOfLines={1}
              >
                To: {user?.name ?? 'Partner'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => sheetRef.current?.dismiss()}
            className="p-1.5 rounded-full bg-gray-100 active:bg-gray-200"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="close" size={20} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Composer */}
        <View className="bg-gray-100 rounded-xl px-3 py-2 border border-gray-200 flex-row items-start">
          <MaterialIcons
            name="chat-bubble-outline"
            size={18}
            color="#6B7280"
            style={{ marginTop: 14, marginHorizontal: 4 }}
          />
          <BottomSheetTextInput
            className="flex-1 text-base text-gray-900 leading-5"
            style={{
              height: composerHeight,
              textAlignVertical: 'top',
              paddingTop: 8,
              paddingBottom: 8,
              paddingHorizontal: 4,
            }}
            value={messageText}
            onChangeText={setMessageText}
            onContentSizeChange={handleComposerSizeChange}
            placeholder="Write a message…"
            placeholderTextColor="#9CA3AF"
            multiline
            autoFocus
            maxLength={1000}
          />
        </View>

        {/* Helper row */}
        <View className="flex-row items-center justify-between mt-2 px-1">
          <Text className="text-xs text-gray-300">Enter adds a new line</Text>
        </View>

        {/* Send */}
        <TouchableOpacity
          onPress={onSendMessage}
          disabled={sendingMessage || !messageText.trim()}
          activeOpacity={0.8}
          className={`mt-4 rounded-xl py-3.5 items-center justify-center flex-row shadow-sm ${
            !messageText.trim() || sendingMessage
              ? 'bg-gray-300'
              : 'bg-emerald-600 active:bg-emerald-700'
          }`}
        >
          {sendingMessage ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MaterialIcons name="send" size={20} color="#FFFFFF" />
              <Text className="text-white font-semibold text-base ml-2">
                Send
              </Text>
            </>
          )}
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
