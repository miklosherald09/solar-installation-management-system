/**
 * ConversationScreen
 * Composes atomic chat components — thin, no useQuery.
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/useAuthStore';
import {
  useMessages,
  useMarkConversationRead,
} from '../../hooks/useConversations';
import { HomeStackParamList } from '../../types';
import {
  startOutgoingCallToUser,
  requestVideoCallPermissions,
} from '../../services/sipService';
import { useCallStore } from '../../store/useCallStore';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ConversationHeader } from './ConversationHeader';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { AddMemberSheet } from './AddMemberSheet';
import { useHideTabBar } from '../../navigation/useHideTabBar';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'ConversationDetail'>;
type Route = RouteProp<HomeStackParamList, 'ConversationDetail'>;

export function ConversationScreen(): React.JSX.Element {
  useHideTabBar();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const {
    conversationId,
    partnerName,
    partnerPhoto,
    partnerId: partnerIdFromParams,
    workId,
  } = route.params;

  const flatListRef = useRef<FlatList>(null);
  const addMemberSheetRef = useRef<BottomSheetModal>(null);
  const { data: messages, isLoading: messagesLoading } =
    useMessages(conversationId);

  // Resolve the partner's user id. Notifications created before the backend
  // began including `partnerId` in their payloads don't carry it, so derive it
  // from the first message sent by the other participant in this conversation.
  const partnerId =
    partnerIdFromParams ||
    messages?.find(m => m.senderId && m.senderId !== user?.id)?.senderId ||
    '';

  const markAsRead = useMarkConversationRead();

  // Mark conversation as read when entering AND when leaving
  useEffect(() => {
    if (user?.id && conversationId) {
      markAsRead.mutate({ conversationId, userId: user.id });
    }

    return () => {
      // Mark as read again on unmount so any messages that came
      // in while the user was on screen are also cleared.
      if (user?.id && conversationId) {
        markAsRead.mutate({ conversationId, userId: user.id });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, user?.id]);

  /**
   * Place an app-to-app VoIP call to the partner by their user id. The callee's
   * SIP endpoint is provisioned on demand by the backend if it is missing.
   */
  const handleCall = async () => {
    if (!partnerId || partnerId === user?.id) {
      Alert.alert(
        'Call unavailable',
        'Recipient details are still loading or unavailable. Please try again.',
      );
      return;
    }

    // Populate the call store immediately to update the CallScreen UI instantly
    useCallStore.getState().setCall({
      callId: null,
      destination: partnerId,
      displayName: partnerName,
      photo: partnerPhoto ?? null,
      conversationId: conversationId,
    });
    useCallStore.getState().setStatus('connecting');

    navigation.navigate('Call', {
      destination: partnerId,
      displayName: partnerName,
      photo: partnerPhoto ?? null,
    });

    try {
      await startOutgoingCallToUser(partnerId, {
        displayName: partnerName,
        photo: partnerPhoto ?? null,
        conversationId: conversationId,
      });
    } catch (err) {
      // If the user hasn't already cancelled (which resets status to 'idle'),
      // show the alert and go back.
      if (useCallStore.getState().status !== 'idle') {
        console.error(
          'Call failed',
          err instanceof Error
            ? err.message
            : 'Could not start the call. Please try again.',
        );
        navigation.goBack();
      }
    }
  };

  /**
   * Place an app-to-app video call to the partner — same flow as handleCall but
   * with the video flag set so the INVITE advertises m=video and the CallScreen
   * (on both ends) renders camera feeds.
   */
  const handleVideoCall = async () => {
    // Ask for camera + microphone permission up-front. If the user is not
    // logged in or declines, abort — do NOT start a call or navigate.
    if (!partnerId || partnerId === user?.id) {
      Alert.alert(
        'Call unavailable',
        'Recipient details are still loading or unavailable. Please try again.',
      );
      return;
    }

    const granted = await requestVideoCallPermissions();
    if (!granted) {
      Alert.alert(
        'Camera permission required',
        'To start a video call, please allow camera and microphone access. You can enable them in Settings → Apps → Solar Installation Management System → Permissions.',
        [{ text: 'OK' }],
      );
      return;
    }

    // Populate the call store immediately to update the CallScreen UI instantly
    useCallStore.getState().setCall({
      callId: null,
      destination: partnerId,
      displayName: partnerName,
      photo: partnerPhoto ?? null,
      conversationId: conversationId,
    });
    useCallStore.getState().setIsVideo(true);
    useCallStore.getState().setVideoEnabled(true);
    useCallStore.getState().setCameraFacing('user');
    useCallStore.getState().setStatus('connecting');

    navigation.navigate('Call', {
      destination: partnerId,
      displayName: partnerName,
      photo: partnerPhoto ?? null,
      isVideo: true,
    });

    try {
      await startOutgoingCallToUser(partnerId, {
        displayName: partnerName,
        photo: partnerPhoto ?? null,
        conversationId: conversationId,
        isVideo: true,
      });
    } catch (err) {
      if (useCallStore.getState().status !== 'idle') {
        Alert.alert(
          'Video call failed',
          err instanceof Error
            ? err.message
            : 'Could not start the video call. Please try again.',
        );
        navigation.goBack();
      }
    }
  };

  const handleOpenAddMember = () => {
    addMemberSheetRef.current?.present();
  };

  const handleGroupCreated = (
    newConversationId: string,
    groupTitle: string,
  ) => {
    navigation.push('ConversationDetail', {
      conversationId: newConversationId,
      partnerName: groupTitle,
      partnerPhoto: null,
      partnerId: '',
      workId,
    });
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ConversationHeader
        partnerName={partnerName}
        partnerPhoto={partnerPhoto}
        partnerId={partnerId}
        subtitle="Online"
        topInset={insets.top}
        onBack={() => navigation.goBack()}
        onPressPartner={
          partnerId
            ? () =>
                navigation.navigate('UserProfile', {
                  userId: partnerId,
                  workId,
                })
            : undefined
        }
        onCall={partnerId ? handleCall : undefined}
        onVideoCall={partnerId ? handleVideoCall : undefined}
        workId={workId}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <MessageList
          ref={flatListRef}
          messages={messages}
          loading={messagesLoading}
          currentUserId={user?.id}
        />

        <ChatInput
          conversationId={conversationId}
          currentUserId={user?.id ?? ''}
          onAddMember={handleOpenAddMember}
        />
      </KeyboardAvoidingView>

      <AddMemberSheet
        sheetRef={addMemberSheetRef}
        conversationId={conversationId}
        currentUserId={user?.id ?? ''}
        currentPartnerId={partnerId}
        currentPartnerName={partnerName}
        workId={workId}
        onGroupCreated={handleGroupCreated}
      />
    </View>
  );
}
