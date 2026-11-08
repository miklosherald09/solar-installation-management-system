import React, { forwardRef, useEffect } from 'react';
import { FlatList, View, Text, ActivityIndicator } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { ConversationMessage } from '../../types';
import { MessageBubble } from './MessageBubble';
import { sameMinute } from './helpers';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  messages: ConversationMessage[] | undefined;
  loading: boolean;
  currentUserId?: string;
}

export const MessageList = forwardRef<FlatList, Props>(
  ({ messages, loading, currentUserId }, ref) => {
    const sorted = React.useMemo(() => {
      if (!messages || messages.length === 0) return [];
      return [...messages].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    }, [messages]);

    const insets = useSafeAreaInsets();

    const scrollToBottom = React.useCallback(() => {
      const list = (ref as React.RefObject<FlatList>)?.current;
      if (!list || sorted.length === 0) return;
      // Defer one frame so the list has finished laying out the new content —
      // scrolling synchronously during onContentSizeChange can land short of
      // the true bottom. No animation: jump straight to the end.
      requestAnimationFrame(() => {
        list.scrollToEnd({ animated: false });
      });
    }, [ref, sorted.length]);

    useEffect(() => {});

    if (loading) {
      return (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#059669" />
        </View>
      );
    }

    return (
      <FlatList
        ref={ref}
        data={sorted}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => {
          const isMine = item.senderId === currentUserId;
          const prevMessage = index > 0 ? sorted[index - 1] : null;
          const nextMessage =
            index < sorted.length - 1 ? sorted[index + 1] : null;

          const showSenderName =
            !isMine && (!prevMessage || prevMessage.senderId !== item.senderId);
          const showTime =
            !nextMessage ||
            nextMessage.senderId !== item.senderId ||
            !sameMinute(item.createdAt, nextMessage.createdAt);
          const isLastInGroup =
            !nextMessage || nextMessage.senderId !== item.senderId;

          return (
            <MessageBubble
              message={item}
              isMine={isMine}
              showSenderName={showSenderName}
              showTime={showTime}
              isLastInGroup={isLastInGroup}
            />
          );
        }}
        contentContainerStyle={{
          paddingHorizontal: 8,
          paddingBottom: insets.bottom,
          flexGrow: 1,
          justifyContent: 'flex-end',
        }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
              <MaterialIcons
                name="chat-bubble-outline"
                size={36}
                color="#9CA3AF"
              />
            </View>
            <Text className="text-base text-gray-500 font-semibold mb-1">
              No messages yet
            </Text>
            <Text className="text-sm text-gray-400 text-center px-8">
              Send a message to start the conversation!
            </Text>
          </View>
        }
        onContentSizeChange={scrollToBottom}
      />
    );
  },
);

MessageList.displayName = 'MessageList';
