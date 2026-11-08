/**
 * WorkCard
 * Displays a work listing in a marketplace-style card.
 *
 * The work-type (job type) image occupies the top of the card — much like
 * a Facebook Marketplace listing where the item image fills the item
 * container. The work details (title, budget, location, etc.) sit below it.
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Work } from '../types';
import {
  useWorkTypes,
  useWorkCurrency,
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
import { Skeleton } from './Skeleton';
import { CredibilityBadge } from './CredibilityBadge';
import { VerifiedBadge } from './VerifiedBadge';
import { WorkReactionSheet } from './WorkReactionSheet';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNearMeStore } from '../store/useNearMeStore';
import { useAuthStore } from '../store/useAuthStore';
import { haversineKm } from '../utils/distanceUtils';

interface WorkCardProps {
  work: Work;
  onPress?: () => void;
  onInterested?: () => void;
  onComments?: () => void;
  compact?: boolean;
  compactAspectRatio?: number;
}

export function WorkCardSm({
  work,
  onPress,
  compact = false,
  compactAspectRatio = 1,
}: WorkCardProps): React.JSX.Element | null {
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

  const isCompleted = work?.status === 'completed';

  const [imageError, setImageError] = React.useState(false);

  if (!work || !work.id) {
    return null;
  }

  const image = work?.images?.length
    ? getImageUrl(work.images[0])
    : `${MINIO_ENDPOINT}${workType?.image}`;

  const isVideo = isVideoUrl(image);

  const handlePlayVideo = (e?: any) => {
    e?.stopPropagation?.();
    playVideo(image);
  };

  return (
    <>
      <TouchableOpacity
        className="bg-white w-full mb-3 overflow-hidden shadow-sm"
        activeOpacity={0.7}
        onPress={onPress}
      >
        {/*
        Job-type image — occupies the top of the card (marketplace style).
        Square for the 2-column work list grid; a wider 4:3 for full-width
        search rows so each card doesn't get too tall.
      */}
        <View
          className="w-full relative"
          style={{
            aspectRatio: compact ? compactAspectRatio : 2,
          }}
        >
          {isVideo || (imageError && work?.images?.length) ? (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handlePlayVideo}
              className="w-full h-full bg-gray-950 items-center justify-center relative overflow-hidden"
              accessibilityLabel="Play video"
              accessibilityRole="button"
            >
              <View className="w-12 h-12 rounded-full bg-black/60 border border-white/80 items-center justify-center shadow">
                <MaterialIcons
                  name="play-arrow"
                  size={30}
                  color="#FFFFFF"
                  style={{ marginLeft: 2 }}
                />
              </View>
              <View className="absolute bottom-2 left-2 flex-row items-center bg-black/70 rounded px-1.5 py-0.5">
                <MaterialIcons name="videocam" size={11} color="#10B981" />
                <Text className="text-white text-[9px] font-bold ml-1 tracking-wider">
                  VIDEO
                </Text>
              </View>
            </TouchableOpacity>
          ) : !imageError ? (
            <Image
              source={{
                uri: image,
              }}
              className="w-full h-full"
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <Skeleton />
          )}

          {/* Category badge overlaid on the image */}
          <View
            className="absolute top-2 left-2 rounded-full px-2 py-0.5"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          >
            <Text className="text-white text-[10px] font-semibold">
              {category.label}
            </Text>
          </View>

          {/* Top-right overlay: Completed status badge */}
          {isCompleted && (
            <View className="absolute top-2 right-2 rounded-full px-2 py-0.5 bg-gray-900/60 flex-row items-center">
              <MaterialIcons name="check-circle" size={11} color="#10B981" />
              <Text className="text-white text-[10px] font-semibold ml-1">
                Completed
              </Text>
            </View>
          )}
        </View>

        {/* Work details — below the job-type image */}
        <View className={compact ? 'p-3' : 'p-4'}>
          {/* Title */}
          {/* <Text
          className={`font-bold text-gray-900 mb-1 ${
            compact ? 'text-sm' : 'text-base'
          }`}
          numberOfLines={2}
        >
          {work.title}
        </Text> */}

          {/* Description & Budget row */}
          <View className="flex-row items-baseline justify-between mb-0.5">
            <Text
              className={`font-bold text-gray-900 flex-1 mr-2 ${
                compact ? 'text-sm' : 'text-base'
              }`}
              numberOfLines={1}
            >
              {work.description}
            </Text>
            <Text
              className={`font-bold text-emerald-600 ${
                compact ? 'text-sm' : 'text-lg'
              }`}
            >
              {formatBudget(work?.budget, work?.budgetType, currencySymbol)}
            </Text>
          </View>

          {/* Location — just below description */}
          {locationSubtitle ? (
            <Text
              className={`text-gray-500 font-medium mb-1.5 ${
                compact ? 'text-[10px]' : 'text-xs'
              }`}
              numberOfLines={1}
            >
              {locationSubtitle}
            </Text>
          ) : null}

          {/* Tags (full only) */}
          {work.tags && work.tags.length > 0 && !compact && (
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
        </View>
      </TouchableOpacity>

      <WorkReactionSheet
        sheetRef={reactionSheetRef}
        selectedReaction={currentReaction}
        onSelectReaction={handleSelectReaction}
      />
    </>
  );
}
