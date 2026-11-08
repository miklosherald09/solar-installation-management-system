import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { AppBottomSheetBackdrop } from '../../components';
import {
  useArchiveConversation,
  useMarkConversationRead,
  useMuteConversation,
  usePinConversation,
} from '../../hooks/useConversations';
import { useAuthStore } from '../../store/useAuthStore';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

type ConversationAction = 'markRead' | 'mute' | 'pin' | 'archive';

interface ActionItem {
  key: ConversationAction;
  icon: MaterialIconName;
  label: string;
  destructive?: boolean;
}

/**
 * Conversation actions shown in the long-press bottom sheet.
 * "Mark as read", "Mute notifications", "Pin conversation" and
 * "Archive conversation" are all wired up.
 */
function buildActions(isMuted: boolean, isPinned: boolean): ActionItem[] {
  return [
    { key: 'markRead', icon: 'done-all', label: 'Mark as read' },
    {
      key: 'mute',
      icon: isMuted ? 'notifications-active' : 'notifications-off',
      label: isMuted ? 'Unmute notifications' : 'Mute notifications',
    },
    {
      key: 'pin',
      icon: 'push-pin',
      label: isPinned ? 'Unpin conversation' : 'Pin conversation',
    },
    { key: 'archive', icon: 'archive', label: 'Archive conversation' },
    // { key: 'delete', icon: 'delete-outline', label: 'Delete conversation', destructive: true },
  ];
}

interface ConversationActionsSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  conversationId: string;
  title: string;
  isMuted: boolean;
  isPinned: boolean;
}

/**
 * Bottom sheet shown when a conversation row is long-pressed.
 * Lists conversation actions (mark as read, mute, pin and archive are wired up).
 */
export function ConversationActionsSheet({
  sheetRef,
  conversationId,
  title,
  isMuted,
  isPinned,
}: ConversationActionsSheetProps): React.JSX.Element {
  const { mutate: archiveConversation } = useArchiveConversation();
  const markAsRead = useMarkConversationRead();
  const { mutate: muteConversation } = useMuteConversation();
  const { mutate: pinConversation } = usePinConversation();
  const { user } = useAuthStore();

  const actions = buildActions(isMuted, isPinned);

  const handleActionPress = (action: ConversationAction) => {
    if (action === 'archive') {
      sheetRef.current?.dismiss();
      archiveConversation(conversationId);
      return;
    }

    if (action === 'markRead') {
      if (!user?.id) {
        return;
      }

      sheetRef.current?.dismiss();
      markAsRead.mutate({ conversationId, userId: user.id });
      return;
    }

    if (action === 'mute') {
      sheetRef.current?.dismiss();
      muteConversation({ conversationId, muted: !isMuted });
      return;
    }

    if (action === 'pin') {
      sheetRef.current?.dismiss();
      pinConversation({ conversationId, pinned: !isPinned });
    }
  };

  const renderBackdrop = useCallback(
    (props: any) => <AppBottomSheetBackdrop {...props} />,
    [],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={['50%']}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
    >
      <BottomSheetView>
        <View className="px-5 pt-4 pb-2 border-b border-gray-100">
          <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
            {title}
          </Text>
        </View>

        {actions.map(action => (
          <TouchableOpacity
            key={action.key}
            className="flex-row items-center px-5 py-4 border-b border-gray-100"
            activeOpacity={0.7}
            accessibilityRole="button"
            onPress={() => handleActionPress(action.key)}
          >
            <MaterialIcons
              name={action.icon}
              size={22}
              color={action.destructive ? '#EF4444' : '#374151'}
            />
            <Text
              className={`ml-3 text-base ${
                action.destructive ? 'text-red-500' : 'text-gray-800'
              }`}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          className="items-center h-20"
          activeOpacity={0.7}
          onPress={() => sheetRef.current?.dismiss()}
          accessibilityRole="button"
        >
          {/* <Text className="text-base font-semibold text-gray-500">Cancel</Text> */}
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
