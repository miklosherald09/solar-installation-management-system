/**
 * WorkCard
 * Displays a work listing in a marketplace-style card.
 *
 * The work-type (job type) image occupies the top of the card — much like
 * a Facebook Marketplace listing where the item image fills the item
 * container. The work details (title, budget, location, etc.) sit below it.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Work } from '../types';
import {
  useWorkTypes,
  useWorkCurrency,
  conversationKeys,
  useWorkReactions,
  useToggleWorkReaction,
} from '../hooks';
import { getCategoryInfo, workTypeToCategoryInfo } from '../constants';
import { formatBudget, playVideo } from '../utils';
import {
  getImageUrl,
  MINIO_ENDPOINT,
  isVideoUrl,
} from '../services/minioService';
import {
  createWorkConversation,
  checkExistingWorkConversation,
} from '../services/messagingService';
import { saveUserWorkTypes } from '../services/userService';
import { requestPushNotif } from '../services/pushNotificationService';
import { Skeleton } from './Skeleton';
import { CredibilityBadge } from './CredibilityBadge';
import { VerifiedBadge } from './VerifiedBadge';
import { WorkReactionSheet } from './WorkReactionSheet';
import { WorkShareSheet } from './WorkShareSheet';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNearMeStore } from '../store/useNearMeStore';
import { useAuthStore, setAuthUser } from '../store/useAuthStore';
import { haversineKm } from '../utils/distanceUtils';

interface WorkCardProps {
  work: Work;
  onPress?: () => void;
  onInterested?: () => void;
  onComments?: () => void;
}

export function WorkCard({
  work,
  onPress,
  onInterested,
  onComments,
}: WorkCardProps): React.JSX.Element | null {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [applying, setApplying] = React.useState(false);
  const { data: workTypes } = useWorkTypes();
  const workType = workTypes?.find(j => j.slug === work?.category);
  const category = workTypeToCategoryInfo(
    workType,
    getCategoryInfo(work?.category || ''),
  );
  const currencySymbol = useWorkCurrency(work);

  const { latitude: nearMeLat, longitude: nearMeLon } = useNearMeStore();
  const { user } = useAuthStore();

  const reactionSheetRef = React.useRef<BottomSheetModal>(null);
  const { data: reactionData } = useWorkReactions(work?.id || '', user?.id);
  const toggleReactionMutation = useToggleWorkReaction(
    work?.id || '',
    user?.id,
  );

  const currentReaction = reactionData?.userReaction ?? null;
  const totalReactions = reactionData?.totalCount ?? 0;
  const hasReacted = !!currentReaction;

  const handleLikePress = (e?: any) => {
    e?.stopPropagation?.();
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to react to works.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }

    toggleReactionMutation.mutate({
      reaction: currentReaction || '👍',
    });
  };

  const handleLikeLongPress = (e?: any) => {
    e?.stopPropagation?.();
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to react to works.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }

    reactionSheetRef.current?.present();
  };

  const handleSelectReaction = (reaction: string) => {
    toggleReactionMutation.mutate({ reaction });
  };

  const formattedDistance = React.useMemo(() => {
    if (work?.distance && work.distance.trim()) {
      return work.distance;
    }
    const userLat = nearMeLat ?? user?.nearMeLatitude ?? user?.latitude;
    const userLon = nearMeLon ?? user?.nearMeLongitude ?? user?.longitude;
    if (
      userLat != null &&
      userLon != null &&
      work?.latitude != null &&
      work?.longitude != null
    ) {
      const dist = haversineKm(userLat, userLon, work.latitude, work.longitude);
      return dist < 1
        ? `${Math.round(dist * 1000)} m`
        : `${dist.toFixed(1)} km`;
    }
    return null;
  }, [
    work?.distance,
    work?.latitude,
    work?.longitude,
    nearMeLat,
    nearMeLon,
    user?.nearMeLatitude,
    user?.nearMeLongitude,
    user?.latitude,
    user?.longitude,
  ]);

  const locationLabel = work?.conciseLocation || work?.location || '';
  const locationSubtitle = [formattedDistance, locationLabel]
    .filter(Boolean)
    .join(' · ');

  const isOwnWork = !!user && !!work?.postedBy && user.id === work.postedBy.id;
  const isCompleted = work?.status === 'completed';

  const handleInterestedPress = async (e?: any) => {
    e?.stopPropagation?.();
    if (onInterested) {
      onInterested();
      return;
    }

    if (!user) {
      Alert.alert(
        'Sign in required',
        'Please sign in to contact work posters.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigation.navigate('Login') },
        ],
      );
      return;
    }

    setApplying(true);
    try {
      const existing = await checkExistingWorkConversation({
        userId: user.id,
        workId: work.id,
      });

      if (existing?.conversation_id) {
        setApplying(false);
        navigation.navigate('ConversationDetail', {
          conversationId: existing.conversation_id,
          partnerName: work.postedBy?.name ?? 'Work Poster',
          partnerId: work.postedBy?.id,
          partnerPhoto: work.postedBy?.photo,
          partnerPhone: work.contactPhone ?? undefined,
          workId: work.id,
        });
        return;
      }
    } catch {
      // Proceed to express interest if existing check fails
    } finally {
      setApplying(false);
    }

    await requestPushNotif(user.id);

    Alert.alert(
      'Express interest?',
      `You will be contacting ${
        work.postedBy?.name || 'the work poster'
      } about this opportunity.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: "I'm Interested",
          onPress: async () => {
            setApplying(true);
            try {
              const conversationId = await createWorkConversation({
                userId: user.id,
                workId: work.id,
              });

              queryClient.invalidateQueries({
                queryKey: conversationKeys.list(),
              });

              if (
                work.category &&
                !user.neededWorkType?.includes(work.category)
              ) {
                const nextWorkTypes = [
                  ...(user.neededWorkType ?? []),
                  work.category,
                ];
                saveUserWorkTypes(user.id, nextWorkTypes).catch(() => {});
                setAuthUser({ ...user, neededWorkType: nextWorkTypes });
              }

              navigation.navigate('ConversationDetail', {
                conversationId,
                partnerName: work.postedBy?.name ?? 'Work Poster',
                partnerId: work.postedBy?.id,
                partnerPhoto: work.postedBy?.photo,
                partnerPhone: work.contactPhone ?? undefined,
                workId: work.id,
              });
            } catch (err: any) {
              try {
                const existing = await checkExistingWorkConversation({
                  userId: user.id,
                  workId: work.id,
                });
                if (existing?.conversation_id) {
                  navigation.navigate('ConversationDetail', {
                    conversationId: existing.conversation_id,
                    partnerName: work.postedBy?.name ?? 'Work Poster',
                    partnerId: work.postedBy?.id,
                    partnerPhoto: work.postedBy?.photo,
                    partnerPhone: work.contactPhone ?? undefined,
                    workId: work.id,
                  });
                  return;
                }
              } catch {
                // Ignore fallback check error
              }

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

  const handleCommentsPress = (e?: any) => {
    e?.stopPropagation?.();
    if (onComments) {
      onComments();
    } else {
      navigation.navigate('WorkComments', {
        workId: work.id,
        workTitle: work.title,
        workDescription: work.description,
        posterUserId: work.postedBy?.id,
      });
    }
  };

  const shareSheetRef = React.useRef<BottomSheetModal>(null);

  const handleSharePress = (e?: any) => {
    e?.stopPropagation?.();
    shareSheetRef.current?.present();
  };

  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] =
    React.useState<number>(windowWidth);
  const [scrollX, setScrollX] = React.useState<number>(0);
  const [canScrollLeft, setCanScrollLeft] = React.useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = React.useState<boolean>(false);
  const scrollViewRef = React.useRef<ScrollView>(null);

  const imageList = React.useMemo(() => {
    if (work?.images && work.images.length > 0) {
      return work.images.map(img => getImageUrl(img));
    }
    if (workType?.image) {
      return [`${MINIO_ENDPOINT}${workType.image}`];
    }
    return [];
  }, [work?.images, workType?.image]);

  React.useEffect(() => {
    if (imageList.length > 1) {
      setCanScrollRight(true);
      setCanScrollLeft(false);
      setScrollX(0);
    } else {
      setCanScrollRight(false);
      setCanScrollLeft(false);
    }
  }, [imageList.length]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const currentX = contentOffset.x;
    setScrollX(currentX);
    setCanScrollLeft(currentX > 8);
    setCanScrollRight(
      currentX < contentSize.width - layoutMeasurement.width - 8,
    );
  };

  const handleContainerLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== containerWidth) {
      setContainerWidth(w);
    }
  };

  const handleScrollLeft = (e?: any) => {
    e?.stopPropagation?.();
    const targetX = Math.max(0, scrollX - (containerWidth || windowWidth));
    scrollViewRef.current?.scrollTo({ x: targetX, animated: true });
  };

  const handleScrollRight = (e?: any) => {
    e?.stopPropagation?.();
    const targetX = scrollX + (containerWidth || windowWidth);
    scrollViewRef.current?.scrollTo({ x: targetX, animated: true });
  };

  if (!work || !work.id) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        className="bg-white w-full mb-3 overflow-hidden shadow-sm"
        activeOpacity={0.7}
        onPress={onPress}
      >
        {/*
          Job-type image container — capped at max-height to avoid overly long images,
          horizontally scrollable with dynamic arrows when multiple images exist.
        */}
        <View
          className="w-full relative overflow-hidden bg-gray-100"
          style={{ height: 240, maxHeight: 280 }}
          onLayout={handleContainerLayout}
        >
          {imageList.length > 0 ? (
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              contentContainerStyle={{ alignItems: 'center' }}
            >
              {imageList.map((uri, idx) => (
                <CardImageItem
                  key={`${uri}-${idx}`}
                  uri={uri}
                  width={containerWidth || windowWidth}
                  height={240}
                />
              ))}
            </ScrollView>
          ) : (
            <Skeleton />
          )}

          {/* Dynamic Left Arrow Button */}
          {canScrollLeft && imageList.length > 1 && (
            <TouchableOpacity
              className="absolute left-2 top-1/2 bg-black/55 active:bg-black/75 rounded-full p-1.5 items-center justify-center z-20 shadow"
              style={{ transform: [{ translateY: -16 }] }}
              activeOpacity={0.8}
              onPress={handleScrollLeft}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Previous image"
              accessibilityRole="button"
            >
              <MaterialIcons name="chevron-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* Dynamic Right Arrow Button */}
          {canScrollRight && imageList.length > 1 && (
            <TouchableOpacity
              className="absolute right-2 top-1/2 bg-black/55 active:bg-black/75 rounded-full p-1.5 items-center justify-center z-20 shadow"
              style={{ transform: [{ translateY: -16 }] }}
              activeOpacity={0.8}
              onPress={handleScrollRight}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Next image"
              accessibilityRole="button"
            >
              <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* Image index counter badge when multiple images */}
          {imageList.length > 1 && (
            <View className="absolute bottom-2 right-2 rounded-full px-2 py-0.5 bg-black/60 z-10">
              <Text className="text-white text-[10px] font-semibold">
                {Math.min(
                  imageList.length,
                  Math.max(
                    1,
                    Math.round(scrollX / (containerWidth || windowWidth || 1)) +
                      1,
                  ),
                )}{' '}
                / {imageList.length}
              </Text>
            </View>
          )}

          {/* Top-right overlay: Completed status badge */}
          {isCompleted && (
            <View className="absolute top-2 right-2 rounded-full px-2 py-0.5 bg-gray-900/60 flex-row items-center z-10">
              <MaterialIcons name="check-circle" size={11} color="#10B981" />
              <Text className="text-white text-[10px] font-semibold ml-1">
                Completed
              </Text>
            </View>
          )}
        </View>

        {/* Work details — below the job-type image */}
        <View className="p-4">
          {/* Description & Budget row */}
          <View className="flex-row items-baseline justify-between">
            <Text
              className="font-bold text-gray-900 flex-1 mr-2 text-xl"
              numberOfLines={1}
            >
              {work.description}
            </Text>
            <Text className="font-bold text-emerald-600 text-lg">
              {formatBudget(work?.budget, work?.budgetType, currencySymbol)}
            </Text>
          </View>
          {/* Category badge */}
          <View className="">
            <Text className="text-gray-900 text-sm font-semibold">
              {category.label}
            </Text>
          </View>
          {/* Location — just below description */}
          <View className="mt-2">
            {locationSubtitle ? (
              <Text
                className="text-gray-500 font-medium mb-1.5 text-xs"
                numberOfLines={1}
              >
                {locationSubtitle}
              </Text>
            ) : null}
          </View>

          {/* Tags */}
          {work.tags && work.tags.length > 0 && (
            <View className="flex-row flex-wrap mb-2">
              {work.tags.slice(0, 3).map((tag, index) => (
                <View
                  key={index}
                  className="bg-gray-100 px-2 py-0.5 rounded-full mr-1.5 mb-1"
                >
                  <Text className="text-xs text-gray-600">{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Poster credibility, verified pro & scheduled date */}
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center">
              {work.postedBy && (
                <>
                  <CredibilityBadge
                    compact
                    rating={work.postedBy.rating}
                    reviewCount={work.postedBy.reviewCount}
                  />
                  {work.postedBy.verifiedAt && (
                    <View className="ml-1.5">
                      <VerifiedBadge size={13} />
                    </View>
                  )}
                </>
              )}
            </View>

            {work.scheduledDate &&
            !isNaN(new Date(work.scheduledDate).getTime()) ? (
              <Text className="text-[11px] text-gray-400">
                {new Date(work.scheduledDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            ) : null}
          </View>

          {/* Footer info & Action buttons */}
          <View className="flex-row items-center justify-between mt-2 pt-4 border-t border-gray-100">
            {/* Reaction Button — left side */}
            <TouchableOpacity
              className="rounded-full flex-row items-center justify-center px-2.5 py-1.5"
              activeOpacity={0.7}
              onPress={handleLikePress}
              onLongPress={handleLikeLongPress}
              delayLongPress={280}
              accessibilityLabel="React to work"
              accessibilityRole="button"
            >
              <Text className="text-sm">{currentReaction || '👍'}</Text>
              {totalReactions > 0 && (
                <Text
                  className={`font-semibold ml-1.5 ${
                    hasReacted ? 'text-emerald-700' : 'text-gray-600'
                  } text-xs`}
                >
                  {totalReactions}
                </Text>
              )}
            </TouchableOpacity>

            {/* Grouped Action Buttons — right side */}
            <View className="flex-row items-center">
              {/* Share Button */}
              <TouchableOpacity
                className="rounded-full flex-row items-center justify-center border border-gray-200 bg-gray-50 active:bg-gray-100 mr-1.5 px-2.5 py-1.5"
                activeOpacity={0.7}
                onPress={handleSharePress}
                accessibilityLabel="Share"
                accessibilityRole="button"
              >
                <MaterialIcons name="share" size={13} color="#4B5563" />
                <Text className="font-semibold text-gray-700 ml-1 text-xs">
                  Share
                </Text>
              </TouchableOpacity>

              {/* Comments Button */}
              <TouchableOpacity
                className="rounded-full flex-row items-center justify-center border border-gray-200 bg-gray-50 active:bg-gray-100 mr-1.5 px-2.5 py-1.5"
                activeOpacity={0.7}
                onPress={handleCommentsPress}
                accessibilityLabel="View comments"
                accessibilityRole="button"
              >
                <MaterialIcons
                  name="chat-bubble-outline"
                  size={13}
                  color="#4B5563"
                />
                <Text className="font-semibold text-gray-700 ml-1 text-xs">
                  Comments
                </Text>
              </TouchableOpacity>

              {/* I'm Interested Button */}
              {!isOwnWork && !isCompleted && (
                <TouchableOpacity
                  className="rounded-full flex-row items-center justify-center border border-emerald-300/80 bg-emerald-50 active:bg-emerald-100 px-3 py-1.5"
                  activeOpacity={0.7}
                  onPress={handleInterestedPress}
                  disabled={applying}
                  accessibilityLabel="I'm Interested"
                  accessibilityRole="button"
                >
                  {applying ? (
                    <ActivityIndicator size="small" color="#047857" />
                  ) : (
                    <>
                      <MaterialIcons
                        name="touch-app"
                        size={14}
                        color="#047857"
                      />
                      <Text className="font-semibold text-emerald-800 ml-1 text-xs">
                        I'm Interested
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>

      <WorkReactionSheet
        sheetRef={reactionSheetRef}
        selectedReaction={currentReaction}
        onSelectReaction={handleSelectReaction}
      />
      <WorkShareSheet sheetRef={shareSheetRef} work={work} />
    </>
  );
}

function CardImageItem({
  uri,
  width,
  height,
}: {
  uri: string;
  width: number;
  height: number;
}): React.JSX.Element {
  const [hasError, setHasError] = React.useState(false);
  const isVideo = isVideoUrl(uri);

  const handlePlay = (e?: any) => {
    e?.stopPropagation?.();
    playVideo(uri);
  };

  if (!uri) {
    return (
      <View
        style={{ width, height }}
        className="bg-gray-100 items-center justify-center"
      >
        <Skeleton />
      </View>
    );
  }

  // If known video or failed Fresco image decode (e.g. camera-recorded mp4 without extension)
  if (isVideo || hasError) {
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={handlePlay}
        style={{ width, height }}
        className="bg-gray-950 items-center justify-center relative overflow-hidden"
        accessibilityLabel="Play video"
        accessibilityRole="button"
      >
        {/* Subtle camera icon background graphic */}
        <View className="absolute items-center justify-center opacity-15">
          <MaterialIcons name="videocam" size={96} color="#FFFFFF" />
        </View>

        {/* Center Play Button */}
        <View className="items-center justify-center">
          <View className="w-16 h-16 rounded-full bg-black/65 border-2 border-white/80 items-center justify-center shadow-lg active:scale-95">
            <MaterialIcons
              name="play-arrow"
              size={40}
              color="#FFFFFF"
              style={{ marginLeft: 3 }}
            />
          </View>
          <Text className="text-white text-xs font-semibold mt-2 tracking-wide shadow">
            Play Video
          </Text>
        </View>

        {/* Bottom-left VIDEO badge */}
        <View className="absolute bottom-2 left-2 flex-row items-center bg-black/75 rounded-md px-2 py-1">
          <MaterialIcons name="videocam" size={13} color="#10B981" />
          <Text className="text-white text-[10px] font-bold ml-1 tracking-wider">
            VIDEO
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{ width, height }}
      resizeMode="cover"
      onError={() => setHasError(true)}
    />
  );
}
