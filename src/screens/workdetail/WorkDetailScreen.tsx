/**
 * WorkDetailScreen
 * Thin composer — delegates to sub-components.
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Alert,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { CountryCodePicker } from '../../components';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  getCountryByIso,
  toNationalDigits,
  isValidNational,
  buildE164,
} from '../../data/countries';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore, setAuthUser } from '../../store/useAuthStore';
import {
  useWork,
  useCompleteWork,
  useUpdateWork,
  useAcceptApplicant,
} from '../../hooks/useWorks';
import { useWorkTypes } from '../../hooks/useWorkTypes';
import { getImageUrl } from '../../services/minioService';
import { createWorkConversation } from '../../services/messagingService';
import { saveUserWorkTypes } from '../../services/userService';
import { requestPushNotif } from '../../services/pushNotificationService';
import { HomeStackParamList, WorkType, ConversationPreview } from '../../types';
import {
  useCheckExistingWorkConversation,
  useConversations,
  conversationKeys,
} from '../../hooks';
import { useCreateReview, useHasReviewed } from '../../hooks/useReviews';
import { hasReviewed } from '../../services/reviewService';
import { MultiReviewSheet } from '../../components/MultiReviewSheet';
import { ReviewSheet } from '../../components/ReviewSheet';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { AppBottomSheetBackdrop } from '../../components/AppBottomSheetBackdrop';
import { WorkDetailHeader } from './WorkDetailHeader';
import { WorkDetailContent } from './WorkDetailContent';
import type { WorkDetailData } from './WorkDetailContent';
import { WorkDetailSkeleton } from './WorkDetailSkeleton';
import { WorkDetailInterestButton } from './WorkDetailInterestButton';
import { WorkDetailImageViewer } from './WorkDetailImageViewer';
import { useHideTabBar } from '../../navigation/useHideTabBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type WorkDetailScreenNavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  'WorkDetail'
>;
type WorkDetailScreenRouteProp = RouteProp<HomeStackParamList, 'WorkDetail'>;

export function WorkDetailScreen(): React.JSX.Element {
  useHideTabBar();
  const navigation = useNavigation<WorkDetailScreenNavigationProp>();
  const route = useRoute<WorkDetailScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'android' ? insets.bottom + 6 : 6;

  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [applying, setApplying] = React.useState(false);
  const [optimisticHasConversation, setOptimisticHasConversation] =
    React.useState(false);

  // Image viewer state
  const [viewerVisible, setViewerVisible] = React.useState(false);
  const [viewerIndex, setViewerIndex] = React.useState(0);

  // Edit contact phone modal state
  const mobileSheetRef = React.useRef<BottomSheetModal>(null);
  const [countryPickerVisible, setCountryPickerVisible] = React.useState(false);
  const [modalCountryIso, setModalCountryIso] = React.useState('PH');
  const [modalPhone, setModalPhone] = React.useState('');

  const mobileSnapPoints = useMemo(
    () => (Platform.OS === 'ios' ? ['30%'] : ['30%']),
    [],
  );

  // Review sheet state (multi-user after work completion)
  const reviewSheetRef = React.useRef<BottomSheetModal>(null);
  const { mutateAsync: submitReview, isPending: submittingReview } =
    useCreateReview();
  const [reviewTargets, setReviewTargets] = React.useState<
    { userId: string; userName: string }[]
  >([]);
  const [alreadyReviewedMap, setAlreadyReviewedMap] = React.useState<
    Record<string, boolean>
  >({});

  // Worker → Owner review state (single-user review sheet)
  const workerReviewSheetRef = React.useRef<BottomSheetModal>(null);
  const [workerReviewRating, setWorkerReviewRating] = React.useState(0);
  const [workerReviewComment, setWorkerReviewComment] = React.useState('');

  const renderBackdrop = useCallback(
    (props: any) => <AppBottomSheetBackdrop {...props} />,
    [],
  );

  // Data
  const { data: result, isLoading } = useWork(route.params.workId);
  const work = result?.status === 'found' ? result.work : undefined;
  const { data: workTypes } = useWorkTypes();
  const { mutateAsync: completeWork } = useCompleteWork();
  const { mutateAsync: updateWork } = useUpdateWork();
  const { mutateAsync: acceptApplicant } = useAcceptApplicant();
  // Fire the conversation check as soon as the workId is known — it does NOT
  // need the full work object. The button shows "I'm Interested" optimistically
  // while the check runs in the background.
  const { data: checkResult } = useCheckExistingWorkConversation(
    route.params.workId,
  );
  // The owner's inbox — used to surface everyone who expressed interest in this
  // particular work (conversations created from a work are linked by workId).
  const { data: conversations } = useConversations();

  const origin = route.params.origin;

  const matchedWorkType: WorkType | undefined = React.useMemo(() => {
    if (!work || !workTypes) return undefined;
    return workTypes.find(wt => wt.slug === work.category);
  }, [work, workTypes]);

  // Conversations linked to this work — i.e. the people who are interested.
  const interestedConversations: ConversationPreview[] = React.useMemo(
    () =>
      user && work && user.id === work.postedBy.id
        ? (conversations ?? []).filter(
            c => c.workId === work.id && c.partner?.name,
          )
        : [],
    [conversations, work, user],
  );

  // Derive values — computed before the early returns so the React Hook call
  // below always runs in the same order on every render.
  const isOwnWork = !!user && !!work && user.id === work.postedBy.id;
  const isAcceptedWorker =
    !!user &&
    !!work &&
    !isOwnWork &&
    (work.acceptedUserIds || []).includes(user.id);

  // Worker→Owner review: check if worker already reviewed the poster for this
  // work. Called unconditionally (before any early return) to respect the Rules
  // of Hooks — when the user isn't an accepted worker on a completed work the
  // ids are undefined and the query is disabled inside useHasReviewed.
  const { data: workerAlreadyReviewed } = useHasReviewed(
    isAcceptedWorker && work?.status === 'completed' ? work?.id : undefined,
    isAcceptedWorker && work?.status === 'completed'
      ? work?.postedBy.id
      : undefined,
  );

  // Loading state — skeleton that mirrors the page layout
  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50">
        <WorkDetailHeader />
        <WorkDetailSkeleton />
      </View>
    );
  }

  if (!work) {
    return (
      <View className="flex-1 bg-gray-50">
        <WorkDetailHeader />
        <View className="flex-1 items-center justify-center bg-gray-50">
          <MaterialIcons name="air" size={50} color="#006742" />
          <Text className="text-lg text-gray-500 max-w-48">
            Work not found, work is either deleted expired or completed
          </Text>
        </View>
      </View>
    );
  }

  const canWorkerRate =
    isAcceptedWorker && work.status === 'completed' && !workerAlreadyReviewed;

  const imageUrls: string[] = work.images
    ? work.images.map(key => getImageUrl(key))
    : [];

  const contentData: WorkDetailData = {
    images: imageUrls,
    category: work.category,
    createdAt: work.createdAt,
    budget: work.budget,
    budgetType: work.budgetType,
    currency: work.currency,
    location: work.location,
    latitude: work.latitude,
    longitude: work.longitude,
    distance: work.distance,
    scheduledDate: work.scheduledDate,
    durationValue: work.durationValue,
    durationUnit: work.durationUnit,
    description: work.description,
    tags: work.tags ?? [],
    contactPhone: work.contactPhone,
    phoneCountryCode: work.phoneCountryCode,
    postedBy: {
      id: work.postedBy.id,
      name: work.postedBy.name,
      photo: work.postedBy.photo,
      email: work.postedBy.email,
      verifiedAt: work.postedBy.verifiedAt,
    },
    acceptedUserIds: work.acceptedUserIds || [],
  };

  const handleImagePress = (index: number) => {
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const handleLocationPress = () => {
    const { latitude, longitude } = work;
    if (latitude == null || longitude == null) {
      Alert.alert(
        'Location unavailable',
        'This work does not have a map location.',
      );
      return;
    }
    navigation.navigate('WorkLocationMap', {
      latitude,
      longitude,
      address: work.location,
    });
  };

  const handleInterested = async () => {
    if (!user) {
      Alert.alert(
        'Sign in required',
        'Please sign in to contact work posters.',
      );
      return;
    }

    // Add this work's category to the user's capable / willing work types
    // (deduped) so their profile reflects the kinds of work they take on.
    // Best-effort — never blocks or fails the "I'm Interested" flow.
    const captureWorkTypeForUser = async () => {
      try {
        const slug = work?.category;
        if (!slug) return;
        if (user.neededWorkType?.includes(slug)) return;

        const nextWorkTypes = [...(user.neededWorkType ?? []), slug];
        // Persist to backend first, then reflect locally.
        await saveUserWorkTypes(user.id, nextWorkTypes);
        setAuthUser({ ...user, neededWorkType: nextWorkTypes });
      } catch (err) {
        console.warn('[WorkDetail] Save work types failed:', err);
      }
    };

    // Prompt for push notifications before expressing interest (non-blocking)
    await requestPushNotif(user.id);

    Alert.alert(
      'Express interest?',
      'You will be contacting the work poster about this opportunity.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: "I'm Interested",
          onPress: async () => {
            setApplying(true);
            try {
              const conversationId = await createWorkConversation({
                userId: user.id,
                workId: route.params.workId,
              });

              setOptimisticHasConversation(true);
              queryClient.invalidateQueries({
                queryKey: conversationKeys.list(),
              });

              await captureWorkTypeForUser();

              navigation.navigate('ConversationDetail', {
                conversationId,
                partnerName: work.postedBy.name,
                partnerId: work.postedBy.id,
                partnerPhoto: work.postedBy.photo,
                partnerPhone: work.contactPhone ?? undefined,
                workId: work.id,
              });
            } catch (err: any) {
              Alert.alert(
                'Error',
                err?.message ||
                  'Could not create conversation. Please try again.',
              );
            } finally {
              setApplying(false);
            }
          },
        },
      ],
    );
  };

  const handleContact = () => {
    const convId = checkResult?.conversation_id;

    if (convId) {
      navigation.navigate('ConversationDetail', {
        conversationId: convId,
        partnerName: work.postedBy.name,
        partnerId: work.postedBy.id,
        partnerPhoto: work.postedBy.photo ?? undefined,
        partnerPhone: work.contactPhone ?? undefined,
        workId: work.id,
      });
    }
  };

  const handleOpenConversation = (c: ConversationPreview) => {
    navigation.navigate('ConversationDetail', {
      conversationId: c.id,
      partnerName: c.partner?.name || 'Chat',
      partnerId: c.partner?.id,
      partnerPhoto: c.partner?.photo ?? undefined,
      partnerPhone: c.partner?.phone ?? undefined,
      workId: work.id,
    });
  };

  const handleMorePress = () => {
    navigation.navigate('WorkSettings', { workId: work.id });
  };

  const handlePosterProfile = () => {
    navigation.navigate('UserProfile', { userId: work.postedBy.id });
  };

  const handleEditLocation = () => {
    if (!isOwnWork) {
      Alert.alert(
        'Not allowed',
        'Only the owner of this work can update its location.',
      );
      return;
    }
    navigation.navigate('EditWorkLocation', { workId: work.id });
  };

  const handleEditMobile = () => {
    if (!isOwnWork) return;
    const iso = work.phoneCountryCode || 'PH';
    setModalCountryIso(iso);
    const digits = work.contactPhone
      ? toNationalDigits(work.contactPhone, getCountryByIso(iso))
      : '';
    setModalPhone(digits);
    mobileSheetRef.current?.present();
  };

  const handleCallMobile = () => {
    const phone = work.contactPhone || (work as any).contactPhone;
    if (!phone) {
      Alert.alert('No number', 'This work has no contact number listed.');
      return;
    }
    const telUri = phone.startsWith('+') ? phone : `+${phone}`;
    Linking.openURL(`tel:${telUri}`).catch(() =>
      Alert.alert('Error', 'Could not open the dialer.'),
    );
  };

  const handleSaveMobile = async () => {
    const country = getCountryByIso(modalCountryIso);

    if (modalPhone.trim()) {
      const isPhoneValid = isValidNational(country, modalPhone);
      if (!isPhoneValid) {
        Alert.alert(
          'Invalid phone number',
          `Please enter a valid mobile number for ${
            country?.name || 'the selected country'
          }.`,
        );
        return;
      }
    }

    const contactPhone = modalPhone.trim()
      ? buildE164(country, modalPhone)
      : null;
    const phoneCountryCode = modalPhone.trim() ? modalCountryIso : null;

    try {
      await updateWork({
        workId: work.id,
        data: {
          contactPhone,
          phoneCountryCode,
        },
      });
      mobileSheetRef.current?.dismiss();
    } catch (err: any) {
      Alert.alert(
        'Update failed',
        err?.message || 'Could not save mobile number. Please try again.',
      );
    }
  };

  const handleEditField =
    (
      field:
        | 'reward'
        | 'description'
        | 'workType'
        | 'duration'
        | 'images'
        | 'tags',
    ) =>
    () => {
      if (!isOwnWork) {
        Alert.alert('Not allowed', 'Only the owner of this work can edit it.');
        return;
      }
      navigation.navigate('EditWork', { workId: work.id, field });
    };

  const openMultiReviewSheet = async (acceptedIds: string[]) => {
    // Look up names from interestedConversations
    const targets = acceptedIds.map(id => {
      const convo = interestedConversations.find(c => c.partner?.id === id);
      return {
        userId: id,
        userName: convo?.partner?.name || 'Worker',
      };
    });

    // Check which users have already been reviewed
    const reviewedMap: Record<string, boolean> = {};
    await Promise.all(
      acceptedIds.map(async id => {
        try {
          reviewedMap[id] = await hasReviewed(route.params.workId, id);
        } catch {
          reviewedMap[id] = false;
        }
      }),
    );

    setAlreadyReviewedMap(reviewedMap);
    setReviewTargets(targets);
    reviewSheetRef.current?.present();
  };

  const handleSubmitAllReviews = async (
    reviews: { userId: string; rating: number; comment: string }[],
  ) => {
    const results = await Promise.allSettled(
      reviews.map(r =>
        submitReview({
          workId: route.params.workId,
          revieweeId: r.userId,
          rating: r.rating,
          comment: r.comment || undefined,
        }),
      ),
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    reviewSheetRef.current?.dismiss();

    if (failed === 0) {
      Alert.alert(
        'Reviews submitted!',
        `${succeeded} review${succeeded !== 1 ? 's' : ''} saved.`,
      );
    } else {
      Alert.alert(
        'Reviews submitted',
        `${succeeded} saved, ${failed} failed (may have been already reviewed).`,
      );
    }
  };

  const performComplete = async () => {
    try {
      await completeWork(route.params.workId);
      // After marking complete, prompt the owner to rate each accepted worker
      const acceptedIds = work.acceptedUserIds || [];
      if (isOwnWork && acceptedIds.length > 0) {
        openMultiReviewSheet(acceptedIds);
      }
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.message || 'Could not mark work as completed. Please try again.',
      );
    }
  };

  const handleMarkCompleted = () => {
    Alert.alert(
      'Mark work as completed?',
      'This work will be marked as completed and will no longer appear in the work feed.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', onPress: performComplete },
      ],
    );
  };

  const handleAcceptApplicant = (
    candidateId: string,
    candidateName: string,
  ) => {
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
                workId: work.id,
                userId: candidateId,
                currentAcceptedIds: work.acceptedUserIds || [],
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

  // Worker → Owner review handlers
  const handleWorkerRatePress = () => {
    setWorkerReviewRating(0);
    setWorkerReviewComment('');
    workerReviewSheetRef.current?.present();
  };

  const handleWorkerSubmitReview = async () => {
    if (!work || !user) return;
    try {
      await submitReview({
        workId: work.id,
        revieweeId: work.postedBy.id,
        rating: workerReviewRating,
        comment: workerReviewComment || undefined,
      });
      workerReviewSheetRef.current?.dismiss();
      Alert.alert('Review submitted!', 'Thank you for rating the homeowner.');
    } catch (err: any) {
      Alert.alert(
        'Could not submit review',
        err?.message || 'Please try again.',
      );
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <WorkDetailHeader isOwnWork={isOwnWork} onMorePress={handleMorePress} />
      <WorkDetailContent
        work={contentData}
        matchedWorkType={matchedWorkType}
        onImagePress={handleImagePress}
        onLocationPress={handleLocationPress}
        onEditLocation={isOwnWork ? handleEditLocation : undefined}
        onEditBudget={isOwnWork ? handleEditField('reward') : undefined}
        onEditDescription={
          isOwnWork ? handleEditField('description') : undefined
        }
        onEditCategory={isOwnWork ? handleEditField('workType') : undefined}
        onEditDuration={isOwnWork ? handleEditField('duration') : undefined}
        onEditImages={isOwnWork ? handleEditField('images') : undefined}
        onEditTags={isOwnWork ? handleEditField('tags') : undefined}
        onEditMobile={isOwnWork ? handleEditMobile : undefined}
        onCallMobile={
          !isOwnWork && work.contactPhone ? handleCallMobile : undefined
        }
        interested={isOwnWork ? interestedConversations : undefined}
        onInterestedPress={isOwnWork ? handleOpenConversation : undefined}
        onAcceptPress={isOwnWork ? handleAcceptApplicant : undefined}
        onPosterProfile={handlePosterProfile}
      />

      {isOwnWork && work.status !== 'completed' && (
        <View className="bg-white border-t border-gray-100 px-5 py-4">
          <TouchableOpacity
            className="rounded-xl py-4 mb-0 items-center bg-emerald-600"
            activeOpacity={0.8}
            onPress={handleMarkCompleted}
            accessibilityRole="button"
            accessibilityLabel="Mark work as completed"
          >
            <Text className="text-base font-bold text-white">
              Work Completed
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {canWorkerRate && (
        <View className="bg-white border-t border-gray-100 px-5">
          <TouchableOpacity
            className="rounded-xl py-4 mb-0 items-center bg-amber-500 flex-row justify-center"
            activeOpacity={0.8}
            onPress={handleWorkerRatePress}
            accessibilityRole="button"
            accessibilityLabel="Rate the homeowner"
          >
            <MaterialIcons name="star" size={20} color="#FFF" />
            <Text className="text-base font-bold text-white ml-2">
              Rate Homeowner
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {origin !== 'conversation' && (
        <WorkDetailInterestButton
          isOwnWork={isOwnWork}
          applying={applying}
          hasConversation={!!checkResult || optimisticHasConversation}
          partnerName={work.postedBy.name}
          onInterested={handleInterested}
          onContact={handleContact}
        />
      )}
      <View style={{ marginBottom: bottomPad }} />
      <WorkDetailImageViewer
        visible={viewerVisible}
        imageUrls={imageUrls}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
      />

      {/* Edit Mobile Number Bottom Sheet */}
      <BottomSheetModal
        ref={mobileSheetRef}
        index={0}
        snapPoints={mobileSnapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
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
          {/* Header */}
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-gray-900">
              Edit Contact Number
            </Text>
            <TouchableOpacity
              onPress={() => mobileSheetRef.current?.dismiss()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Text className="text-sm text-gray-500 mb-4">
            Enter a valid contact number where workers can reach you about this
            job.
          </Text>

          {/* Number Input Box */}
          <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden mb-6">
            <TouchableOpacity
              className="flex-row items-center pl-4 pr-2 border-r border-gray-200 py-3.5"
              activeOpacity={0.7}
              onPress={() => setCountryPickerVisible(true)}
              accessibilityLabel="Select country code"
            >
              <Text className="text-lg mr-1">
                {getCountryByIso(modalCountryIso)?.flagEmoji || '🇵🇭'}
              </Text>
              <Text className="text-base font-semibold text-gray-700">
                +{getCountryByIso(modalCountryIso)?.dialCode || '63'}
              </Text>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={18}
                color="#6B7280"
              />
            </TouchableOpacity>
            <BottomSheetTextInput
              className="flex-1 px-4 py-3.5 text-base text-gray-900"
              value={modalPhone}
              onChangeText={setModalPhone}
              placeholder={
                getCountryByIso(modalCountryIso)?.placeholder || '9XX XXX XXXX'
              }
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              autoFocus
            />
            {modalPhone.length > 0 && (
              <TouchableOpacity
                className="pr-3 py-3"
                activeOpacity={0.7}
                onPress={() => setModalPhone('')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <MaterialIcons name="close" size={16} color="#CACAD9" />
              </TouchableOpacity>
            )}
          </View>

          {/* Actions */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-gray-100 py-3.5 rounded-xl items-center border border-gray-200"
              activeOpacity={0.7}
              onPress={() => mobileSheetRef.current?.dismiss()}
            >
              <Text className="text-base font-bold text-gray-700">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-emerald-600 py-3.5 rounded-xl items-center"
              activeOpacity={0.8}
              onPress={handleSaveMobile}
            >
              <Text className="text-base font-bold text-white">Save</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>

      {/* Country Code Picker */}
      <CountryCodePicker
        visible={countryPickerVisible}
        selectedIso={modalCountryIso}
        onSelect={c => {
          setModalCountryIso(c.iso);
          setCountryPickerVisible(false);
        }}
        onClose={() => setCountryPickerVisible(false)}
      />

      {/* Multi-Review Sheet (after work completion — owner rates workers) */}
      <MultiReviewSheet
        sheetRef={reviewSheetRef}
        targets={reviewTargets}
        alreadyReviewedMap={alreadyReviewedMap}
        onSubmitAll={handleSubmitAllReviews}
        submitting={submittingReview}
        bottomPad={bottomPad}
      />

      {/* Worker → Owner Review Sheet */}
      <ReviewSheet
        sheetRef={workerReviewSheetRef}
        targetUserName={work.postedBy.name}
        existingRating={workerReviewRating}
        existingComment={workerReviewComment}
        onRatingChange={setWorkerReviewRating}
        onCommentChange={setWorkerReviewComment}
        onSubmit={handleWorkerSubmitReview}
        submitting={submittingReview}
        alreadyReviewed={!!workerAlreadyReviewed}
        bottomPad={bottomPad}
      />
    </View>
  );
}
