import React, { useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import ReanimatedSwipeable, {
  SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ConversationPreview } from '../../types';
import { usePresenceStore } from '../../store';
import { avatarColor, getInitials, formatTimeAgo } from './helpers';
import { ConversationActionsSheet } from './ConversationActionsSheet';
import { cn } from '../../utils';

/** Width of the "Archive" action revealed when swiping a row left. */
const ARCHIVE_ACTION_WIDTH = 88;

interface Props {
  conversation: ConversationPreview;
  onPress: () => void;
  onArchive: () => void;
}

/**
 * The "Archive" action revealed when swiping a row left. Its opacity is driven
 * by the swipe progress so it stays fully hidden until the user starts dragging.
 */
function ArchiveAction({
  progress,
  onPress,
}: {
  progress: SharedValue<number>;
  onPress: () => void;
}): React.JSX.Element {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  return (
    <Animated.View style={[{ height: '100%' }, animatedStyle]}>
      <TouchableOpacity
        className="items-center justify-center"
        style={{
          width: ARCHIVE_ACTION_WIDTH,
          height: '100%',
          backgroundColor: '#0088FF',
        }}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Archive conversation"
        onPress={onPress}
      >
        <MaterialIcons name="archive" size={24} color="#FFFFFF" />
        <Text className="text-white text-xs font-semibold mt-1">Archive</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const formatLastMessage = (
  lastMessage: string | null,
  hasUnread?: boolean,
): string | React.JSX.Element => {
  if (!lastMessage) return 'No messages yet';
  if (lastMessage.startsWith('{"type":"call_log"')) {
    try {
      const parsed = JSON.parse(lastMessage);
      if (parsed && parsed.type === 'call_log') {
        const isCompleted = parsed.status === 'completed';
        return (
          <View className="flex-row">
            <MaterialIcons
              name="call"
              size={14}
              color={isCompleted ? '#6B7280' : '#EF4444'}
              style={{ marginRight: 2, marginTop: 1 }}
            />
            <Text
              className={cn(
                'text-sm',
                hasUnread ? 'font-medium' : 'font-normal',
                isCompleted ? 'text-gray-800 font-medium' : 'text-red-600',
              )}
            >
              {isCompleted ? 'Voice call' : 'Missed call'}
            </Text>
          </View>
        );
      }
    } catch {
      // ignore
    }
  }

  // Photo message preview
  if (
    lastMessage.startsWith('http') &&
    (/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(lastMessage) ||
      lastMessage.includes('/chats/') ||
      lastMessage.includes('/works/'))
  ) {
    return (
      <View className="flex-row items-center">
        <MaterialIcons
          name="photo-camera"
          size={14}
          color={hasUnread ? '#374151' : '#9CA3AF'}
          style={{ marginRight: 4 }}
        />
        <Text
          className={cn(
            'text-sm',
            hasUnread ? 'text-gray-800 font-medium' : 'text-gray-500',
          )}
        >
          Photo
        </Text>
      </View>
    );
  }

  // Location message preview
  if (
    lastMessage.startsWith('📍 Location:') ||
    (lastMessage.includes('📍') && lastMessage.includes('maps.google.com'))
  ) {
    return (
      <View className="flex-row items-center">
        <MaterialIcons
          name="location-on"
          size={14}
          color={hasUnread ? '#059669' : '#9CA3AF'}
          style={{ marginRight: 3 }}
        />
        <Text
          className={cn(
            'text-sm',
            hasUnread ? 'text-gray-800 font-medium' : 'text-gray-500',
          )}
        >
          Location
        </Text>
      </View>
    );
  }
  return (
    <View className="w-2/3">
      <Text
        numberOfLines={1}
        className={cn(
          `text-sm `,
          hasUnread ? 'text-gray-800 font-medium' : 'text-gray-500',
        )}
      >
        {lastMessage}
      </Text>
    </View>
  );
};

/**
 * A single conversation row: avatar, name, last message and unread indicator.
 * Long-pressing the row opens a bottom sheet of conversation actions, while
 * swiping left reveals an "Archive" action on the right-hand side.
 */
export function ConversationItem({ conversation, onPress, onArchive }: Props) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const swipeableRef = useRef<SwipeableMethods | null>(null);

  // Display name and photo come directly from conversations_by_user table —
  // resolved per-user by the backend
  const displayName = conversation.title || 'New Chat';
  const displayPhoto = conversation.photo;
  const color = avatarColor(displayName);
  const hasUnread = conversation.unreadCount > 0;

  // Track partner online presence for 1:1 direct conversations
  const partnerId = !conversation.isGroup
    ? conversation.partner?.id ||
      conversation.participants?.find(p => p !== conversation.userId)
    : null;

  const partnerPresence = usePresenceStore(
    useCallback(
      state => (partnerId ? state.presences[partnerId] : undefined),
      [partnerId],
    ),
  );

  const isOnline =
    partnerPresence !== undefined
      ? partnerPresence.isOnline || partnerPresence.status === 'ONLINE'
      : conversation.partner?.isOnline === true ||
        conversation.partner?.status === 'ONLINE';

  const isBusy =
    partnerPresence !== undefined
      ? partnerPresence.status === 'BUSY'
      : conversation.partner?.status === 'BUSY';

  const handleArchivePress = useCallback(() => {
    swipeableRef.current?.close();
    onArchive();
  }, [onArchive]);

  const renderRightActions = useCallback(
    (progress: SharedValue<number>) => (
      <ArchiveAction progress={progress} onPress={handleArchivePress} />
    ),
    [handleArchivePress],
  );

  return (
    <>
      <ReanimatedSwipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        // Require a deliberate horizontal drag (beyond normal tap jitter) before
        // the swipe gesture activates, so a simple tap to open the conversation
        // never reveals the Archive action.
        dragOffsetFromLeft={25}
        dragOffsetFromRight={-25}
      >
        <TouchableOpacity
          className="flex-row items-center px-5 py-3.5 border-b border-gray-100 bg-white"
          activeOpacity={0.5}
          onPress={onPress}
          onLongPress={() => sheetRef.current?.present()}
          delayLongPress={300}
        >
          {/* Avatar with Online/Busy Status Dot */}
          <View className="relative mr-3" style={{ width: 48, height: 48 }}>
            {displayPhoto ? (
              <Image
                source={{ uri: displayPhoto }}
                style={{ width: 48, height: 48, borderRadius: 24 }}
                className="bg-gray-200"
              />
            ) : (
              <View
                className="w-12 h-12 rounded-full items-center justify-center"
                style={{ backgroundColor: color + '20' }}
              >
                <Text className="text-base font-bold" style={{ color }}>
                  {getInitials(displayName)}
                </Text>
              </View>
            )}
            {isOnline ? (
              <View
                className={cn(
                  'absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white',
                  isBusy ? 'bg-amber-500' : 'bg-emerald-500',
                )}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  borderWidth: 2,
                  borderColor: '#FFFFFF',
                  backgroundColor: isBusy ? '#F59E0B' : '#10B981',
                }}
              />
            ) : null}
          </View>

          {/* Content */}
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-0.5">
              <View className="flex-row items-center flex-1 mr-2">
                <Text
                  className={`text-base ${
                    hasUnread
                      ? 'font-bold text-gray-900'
                      : 'font-semibold text-gray-700'
                  }`}
                  numberOfLines={1}
                >
                  {displayName}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-xs text-gray-400">
                  {conversation.lastMessageAt
                    ? formatTimeAgo(conversation.lastMessageAt)
                    : formatTimeAgo(conversation.createdAt)}
                </Text>
                {conversation.isPinned ? (
                  <View className="ml-1">
                    <MaterialIcons name="push-pin" size={13} color="#9CA3AF" />
                  </View>
                ) : null}
              </View>
            </View>
            {conversation.isGroup && conversation.title ? (
              <Text className="text-xs text-blue-500 mb-0.5" numberOfLines={1}>
                {conversation.title}
              </Text>
            ) : null}
            {formatLastMessage(conversation.lastMessage, hasUnread)}
          </View>

          {/* Unread indicator & count */}
          {hasUnread ? (
            <View className="items-center ml-2">
              <View className="w-2.5 h-2.5 rounded-full mb-1 bg-emerald-600" />
              <Text className="text-xs font-bold text-emerald-600">
                {conversation.unreadCount}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </ReanimatedSwipeable>

      <ConversationActionsSheet
        sheetRef={sheetRef}
        conversationId={conversation.id}
        title={displayName}
        isMuted={conversation.isMuted}
        isPinned={conversation.isPinned}
      />
    </>
  );
}
