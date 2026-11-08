import React from 'react';
import { View, Text, FlatList, Alert, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQueryClient } from '@tanstack/react-query';
import { HomeStackParamList } from '../../types';
import { useUserById, userSearchKeys } from '../../hooks/useUsers';
import { useUserWorks, useUserCompletedWorks } from '../../hooks';
import { useAuthStore } from '../../store/useAuthStore';
import { useCallStore } from '../../store/useCallStore';
import { startOutgoingCallToUser } from '../../services/sipService';
import { conversationKeys } from '../../hooks/useConversations';
import { useCreateReview, useHasReviewed } from '../../hooks/useReviews';
import { ReviewSheet } from '../../components/ReviewSheet';
import { useWork, useAcceptApplicant } from '../../hooks/useWorks';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { WorkCard } from '../../components';
import {
  checkExistingConversation,
  createConversation,
} from '../../services/messagingService';

import { UserProfileHeader } from './UserProfileHeader';
import { UserProfileHeroCard } from './UserProfileHeroCard';
import { UserWorkAvailabilityCard } from './UserWorkAvailabilityCard';
import { UserMobileNumberCard } from './UserMobileNumberCard';
import { UserCapableWorkTypesCard } from './UserCapableWorkTypesCard';
import { CompletedWorksSection } from './CompletedWorksSection';
import { MessageComposerSheet } from './MessageComposerSheet';
// import { UserButtonCard } from './UserButtonCard';
import { UserProfileSkeleton } from './UserProfileSkeleton';
import { LoginPrompt } from '../messages';
import { CapableWorkTypesModal } from '../../components/CapableWorkTypesModal';
import { WorkAvailabilitySheet } from '../../components/WorkAvailabilitySheet';
import { useUpdateWorkAvailability } from '../../hooks/useWorkAvailability';
import type { WorkAvailability } from '../../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'UserProfile'>;
type Route = RouteProp<HomeStackParamList, 'UserProfile'>;

export function UserProfileScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { user: currentUser, isAuthenticated } = useAuthStore();
  const loggedInUserId = currentUser?.id;

  const params = (route.params ?? {}) as { userId?: string; workId?: string };
  const paramUserId = params.userId;
  const workId = params.workId;
  const userId = paramUserId || loggedInUserId || '';

  const { data: user, isLoading: userLoading } = useUserById(userId);
  const { data: works, isLoading: worksLoading } = useUserWorks(userId);
  const { data: completedWorks, isLoading: completedWorksLoading } =
    useUserCompletedWorks(userId);
  const { data: workResult } = useWork(workId || '');
  const work = workResult?.status === 'found' ? workResult.work : undefined;
  const { mutateAsync: acceptApplicant } = useAcceptApplicant();

  const allWorks = React.useMemo(() => {
    const list = [...(works ?? [])];
    const existingIds = new Set(list.map(w => w.id));
    for (const cw of completedWorks ?? []) {
      if (!existingIds.has(cw.id)) {
        list.push(cw);
      }
    }
    return list;
  }, [works, completedWorks]);

  const total = allWorks.length;
  const loading = userLoading || worksLoading;

  const queryClient = useQueryClient();
  const isSelf = !!loggedInUserId && loggedInUserId === userId;

  const [checkingConvo, setCheckingConvo] = React.useState(false);
  const [sendingMessage, setSendingMessage] = React.useState(false);
  const [messageText, setMessageText] = React.useState('');
  const [composerHeight, setComposerHeight] = React.useState(84);
  const [showCapableModal, setShowCapableModal] = React.useState(false);

  const availabilitySheetRef = React.useRef<BottomSheetModal>(null);
  const { mutate: updateAvailability, isPending: updatingAvailability } =
    useUpdateWorkAvailability();

  const workAvailability: WorkAvailability =
    (isSelf ? currentUser?.workAvailability : user?.workAvailability) ||
    'AVAILABLE';

  const handleOpenAvailabilitySheet = () => {
    availabilitySheetRef.current?.present();
  };

  const handleSelectAvailability = (newStatus: WorkAvailability) => {
    updateAvailability(newStatus, {
      onSettled: () => {
        availabilitySheetRef.current?.dismiss();
      },
    });
  };

  const capableWorkTypes =
    user?.capableWorkTypes && user.capableWorkTypes.length > 0
      ? user.capableWorkTypes
      : (isSelf ? currentUser?.capableWorkTypes : undefined) ?? [];

  const phone = isSelf ? currentUser?.phone ?? user?.phone : user?.phone;
  const phoneCountryCode = isSelf
    ? currentUser?.phoneCountryCode ?? user?.phoneCountryCode
    : user?.phoneCountryCode;

  const MAX_INPUT_HEIGHT = 160;
  const MIN_INPUT_HEIGHT = 84;

  const messageSheetRef = React.useRef<BottomSheetModal>(null);

  // Review sheet state (for rating the profile user from within UserProfileScreen)
  const reviewSheetRef = React.useRef<BottomSheetModal>(null);
  const { mutateAsync: submitReview, isPending: submittingReview } =
    useCreateReview();
  const [reviewRating, setReviewRating] = React.useState(0);
  const [reviewComment, setReviewComment] = React.useState('');

  const { data: alreadyReviewed } = useHasReviewed(workId, userId);

  const isOwnWork = work && currentUser?.id === work.postedBy.id;
  const showAcceptButton =
    isOwnWork &&
    work.status === 'open' &&
    !(work.acceptedUserIds || []).includes(userId) &&
    userId !== loggedInUserId;

  // Whether the current user can rate this profile user for the linked work
  // const canRate = !!(
  //   work &&
  //   work.status === 'completed' &&
  //   !isSelf &&
  //   loggedInUserId &&
  //   // Current user was involved in the work
  //   (work.postedBy.id === loggedInUserId ||
  //     (work.acceptedUserIds || []).includes(loggedInUserId)) &&
  //   // Profile user was involved in the work
  //   (work.postedBy.id === userId ||
  //     (work.acceptedUserIds || []).includes(userId))
  // );

  // const handleRatePress = () => {
  //   setReviewRating(0);
  //   setReviewComment('');
  //   reviewSheetRef.current?.present();
  // };

  const handleSubmitReview = async () => {
    if (!work || !userId) return;
    try {
      await submitReview({
        workId: work.id,
        revieweeId: userId,
        rating: reviewRating,
        comment: reviewComment || undefined,
      });
      reviewSheetRef.current?.dismiss();
      Alert.alert('Review submitted!', 'Thank you for rating your experience.');
    } catch (err: any) {
      Alert.alert(
        'Could not submit review',
        err?.message || 'Please try again.',
      );
    }
  };

  const handleAcceptApplicant = () => {
    const candidateName = user?.name || 'this candidate';
    Alert.alert(
      'Accept Candidate?',
      `Are you sure you want to accept ${candidateName} for this work? The work status will be set to in-progress.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          style: 'default',
          onPress: async () => {
            try {
              await acceptApplicant({
                workId: workId!,
                userId: userId,
                currentAcceptedIds: work?.acceptedUserIds || [],
              });
              Alert.alert('Success', `${candidateName} has been accepted!`);
            } catch (err: any) {
              Alert.alert(
                'Error',
                err?.message || 'Could not accept applicant. Please try again.',
              );
            }
          },
        },
      ],
    );
  };

  const handleComposerSizeChange = (e: any) => {
    const height = e.nativeEvent.contentSize.height;
    setComposerHeight(
      Math.min(
        Math.max(Math.round(height), MIN_INPUT_HEIGHT),
        MAX_INPUT_HEIGHT,
      ),
    );
  };

  const handleMessagePress = async () => {
    if (!loggedInUserId) {
      Alert.alert('Login Required', 'You must be logged in to send a message.');
      return;
    }

    setCheckingConvo(true);
    try {
      const res = await checkExistingConversation({
        userId: loggedInUserId,
        partnerId: userId,
      });

      if (res?.conversation_id) {
        navigation.navigate('ConversationDetail', {
          conversationId: res.conversation_id,
          partnerName: user?.name ?? 'Partner',
          partnerPhoto: user?.photo ?? null,
          partnerId: userId,
          workId: undefined,
        });
      } else {
        setMessageText('');
        messageSheetRef.current?.present();
      }
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.message || 'Failed to check conversation status.',
      );
    } finally {
      setCheckingConvo(false);
    }
  };

  const handleCall = async () => {
    if (!userId || userId === loggedInUserId) {
      Alert.alert(
        'Call unavailable',
        'Recipient details are still loading or unavailable. Please try again.',
      );
      return;
    }

    // Populate the call store immediately so the CallScreen UI updates instantly.
    useCallStore.getState().setCall({
      callId: null,
      destination: userId,
      displayName: user?.name ?? 'Partner',
      photo: user?.photo ?? null,
    });
    useCallStore.getState().setStatus('connecting');

    navigation.navigate('Call', {
      destination: userId,
      displayName: user?.name ?? 'Partner',
      photo: user?.photo ?? null,
    });

    try {
      await startOutgoingCallToUser(userId, {
        displayName: user?.name ?? 'Partner',
        photo: user?.photo ?? null,
      });
    } catch (err) {
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

  const handleSendMessage = async () => {
    const trimmed = messageText.trim();
    if (!trimmed || !loggedInUserId) return;

    setSendingMessage(true);
    try {
      const conversationId = await createConversation({
        userId: loggedInUserId,
        partnerId: userId,
        firstMessage: trimmed,
      });

      queryClient.invalidateQueries({ queryKey: conversationKeys.list() });
      messageSheetRef.current?.dismiss();
      setMessageText('');

      navigation.navigate('ConversationDetail', {
        conversationId,
        partnerName: user?.name ?? 'Partner',
        partnerPhoto: user?.photo ?? null,
        partnerId: userId,
        workId: undefined,
      });
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send message.');
    } finally {
      setSendingMessage(false);
    }
  };

  // const handleCreateNewWork = () => {
  //   navigation.navigate('PostWork', {});
  // };

  if (!isAuthenticated && !userId) {
    return (
      <LoginPrompt
        topInset={insets.top}
        headerTitle="Profile"
        iconName="person"
        subtitle="Sign in with your Google account to post works, apply to jobs, and manage your profile."
      />
    );
  }

  // Show skeleton while fetching
  if (loading) {
    return <UserProfileSkeleton />;
  }

  if (!user?.id) {
    if (!isAuthenticated) {
      return (
        <LoginPrompt
          topInset={insets.top}
          headerTitle="Profile"
          iconName="person"
          subtitle="Sign in with your Google account to post works, apply to jobs, and manage your profile."
        />
      );
    }
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center p-6">
        <Text className="text-gray-500 text-base">User not found</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <UserProfileHeader
        onBackPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            (navigation as any).navigate('HomeTab', { screen: 'Home' });
          }
        }}
        isSelf={isSelf}
        onSettingsPress={
          isSelf
            ? () => {
                (navigation as any).navigate('ProfileSettings');
              }
            : undefined
        }
        onMorePress={
          isSelf || !isAuthenticated
            ? undefined
            : () => navigation.navigate('UserProfileSettings', { userId })
        }
      />

      <FlatList
        data={
          allWorks && allWorks.length % 2 !== 0
            ? [...allWorks, { id: '__placeholder__' } as any]
            : allWorks ?? []
        }
        keyExtractor={item => item.id}
        numColumns={1}
        // columnWrapperStyle={{ gap: 12 }}
        renderItem={({ item }) => {
          // if (item.id === '__placeholder__') {
          //   return <View style={{ flex: 1 }} />;
          // }
          return (
            <View style={{ flex: 1 }}>
              <WorkCard
                work={item}
                onPress={() =>
                  navigation.navigate('WorkDetail', { workId: item.id })
                }
              />
            </View>
          );
        }}
        ListHeaderComponent={
          <View>
            {/* Hero Card */}
            <UserProfileHeroCard
              user={user}
              isSelf={isSelf}
              checkingConvo={checkingConvo}
              onMessagePress={handleMessagePress}
              onCallPress={handleCall}
            />
            {/* Buttons */}
            {/* <UserButtonCard
              isSelf={isSelf}
              checkingConvo={checkingConvo}
              onMessagePress={handleMessagePress}
              canRate={canRate}
              onRatePress={canRate ? handleRatePress : undefined}
              onCreatePress={handleCreateNewWork}
            /> */}
            {/* Work Availability Status Section */}
            <UserWorkAvailabilityCard
              workAvailability={workAvailability}
              isSelf={isSelf}
              onPress={isSelf ? handleOpenAvailabilitySheet : undefined}
            />
            {/* Mobile Number Section — only shown on other users' profiles, not the logged-in user's own */}
            {!isSelf && (
              <UserMobileNumberCard
                phone={phone}
                phoneCountryCode={phoneCountryCode}
                isSelf={false}
              />
            )}
            {/* Capable Work Types / Services Offered */}
            <UserCapableWorkTypesCard
              capableWorkTypes={capableWorkTypes}
              isSelf={isSelf}
              onEditPress={() => setShowCapableModal(true)}
            />

            {/* Completed Works Section */}
            <CompletedWorksSection
              completedWorks={completedWorks}
              completedWorksLoading={completedWorksLoading}
            />

            {/* Works section label */}
            {allWorks && allWorks.length ? (
              <View className="flex-row items-center justify-between px-1 mt-6 mb-2">
                <Text className="text-base font-bold text-gray-900">
                  Posted Works
                </Text>
                <Text className="text-xs text-gray-400">{total} total</Text>
              </View>
            ) : null}
          </View>
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 120,
        }}
      />

      {/* Message Composer Sheet */}
      <MessageComposerSheet
        sheetRef={messageSheetRef}
        user={user}
        messageText={messageText}
        setMessageText={setMessageText}
        sendingMessage={sendingMessage}
        onSendMessage={handleSendMessage}
        composerHeight={composerHeight}
        handleComposerSizeChange={handleComposerSizeChange}
      />

      {showAcceptButton && (
        <View className="bg-white border-t border-gray-100 px-5 py-4">
          <TouchableOpacity
            className="rounded-xl py-4 items-center bg-emerald-600 shadow-md"
            activeOpacity={0.8}
            onPress={handleAcceptApplicant}
            accessibilityRole="button"
            accessibilityLabel="Accept Candidate for Work"
          >
            <View className="flex-row items-center justify-center">
              <MaterialIcons name="assignment-ind" size={20} color="#FFF" />
              <Text className="text-base font-bold text-white ml-2">
                Accept Candidate for Work
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Review Sheet */}
      <ReviewSheet
        sheetRef={reviewSheetRef}
        targetUserName={user?.name ?? 'Partner'}
        existingRating={reviewRating}
        existingComment={reviewComment}
        onRatingChange={setReviewRating}
        onCommentChange={setReviewComment}
        onSubmit={handleSubmitReview}
        submitting={submittingReview}
        alreadyReviewed={!!alreadyReviewed}
      />

      {/* Capable Work Types Edit Modal for self */}
      {isSelf && (
        <CapableWorkTypesModal
          visible={showCapableModal}
          onClose={() => {
            setShowCapableModal(false);
            queryClient.invalidateQueries({
              queryKey: userSearchKeys.detail(userId),
            });
          }}
          editMode={true}
        />
      )}

      {/* Work Availability Sheet for self */}
      {isSelf && (
        <WorkAvailabilitySheet
          sheetRef={availabilitySheetRef}
          currentAvailability={workAvailability}
          onSelect={handleSelectAvailability}
          isPending={updatingAvailability}
        />
      )}
    </View>
  );
}
