import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Pressable,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { getCategoryInfo, workTypeToCategoryInfo } from '../../constants';
import { formatBudget, formatTimeAgo, playVideo } from '../../utils';
import { MINIO_ENDPOINT, isVideoUrl } from '../../services/minioService';
import { WorkType, WorkCategory, ConversationPreview } from '../../types';
import { formatScheduledDate } from './helpers';
import { useAuthStore } from '../../store/useAuthStore';
import { useWorkCurrency } from '../../hooks';
import { maskEmail } from '../../utils';
import { VerifiedBadge } from '../../components/VerifiedBadge';

// ---------------------------------------------------------------------------
// Reusable sections extracted from the old monolithic scrollview
// ---------------------------------------------------------------------------

/** Horizontal scroll of uploaded work images */
function WorkPictureRow({
  images,
  onImagePress,
  onEditImages,
}: {
  images: string[];
  onImagePress: (index: number) => void;
  onEditImages?: () => void;
}) {
  const thumbnails = images ? images.slice(1) : [];

  if (thumbnails.length === 0 && !onEditImages) return null;

  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-base font-bold text-gray-900">Work Pictures</Text>
        {onEditImages && (
          <TouchableOpacity
            onPress={onEditImages}
            className="flex-row items-center"
            activeOpacity={0.7}
          >
            <MaterialIcons name="edit" size={16} color="#059669" />
            <Text className="text-sm font-semibold text-emerald-600 ml-1">
              Edit
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {thumbnails.length === 0 ? (
        <TouchableOpacity
          onPress={onEditImages}
          className="border-2 border-dashed border-emerald-200 rounded-2xl py-6 items-center justify-center bg-emerald-50/20"
          activeOpacity={0.7}
        >
          <View className="w-12 h-12 rounded-full bg-emerald-50 items-center justify-center mb-2 border border-emerald-100">
            <MaterialIcons
              name="add-photo-alternate"
              size={24}
              color="#059669"
            />
          </View>
          <Text className="text-sm font-bold text-gray-800">
            Add Work Photos
          </Text>
          <Text className="text-xs text-gray-400 mt-1 text-center px-4">
            Upload photos of the location or task to help workers find and
            understand the job easily.
          </Text>
        </TouchableOpacity>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {thumbnails.map((uri, index) => {
            const isVideo = isVideoUrl(uri);
            return (
              <TouchableOpacity
                key={index}
                activeOpacity={0.8}
                onPress={() => onImagePress(index + 1)}
                className="relative rounded-lg overflow-hidden bg-gray-900"
              >
                {isVideo ? (
                  <View
                    style={{ width: 100, height: 60 }}
                    className="bg-gray-900 items-center justify-center"
                  >
                    <MaterialIcons
                      name="play-circle-filled"
                      size={24}
                      color="#FFFFFF"
                    />
                    <View className="absolute bottom-1 left-1 bg-black/70 rounded px-1 py-0.5 flex-row items-center">
                      <MaterialIcons name="videocam" size={8} color="#10B981" />
                      <Text className="text-[8px] text-white font-bold ml-0.5">
                        VIDEO
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Image
                    source={{ uri }}
                    style={{ width: 100, height: 60, borderRadius: 8 }}
                    resizeMode="cover"
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

/** Category (work type) card + relative time — white box like the other sections */
function CategoryRow({
  categorySlug,
  workType,
  createdAt,
  onEditCategory,
}: {
  categorySlug: string;
  workType?: WorkType;
  createdAt: string;
  onEditCategory?: () => void;
}) {
  const category = workTypeToCategoryInfo(
    workType,
    getCategoryInfo(categorySlug as WorkCategory),
  );

  const box = (
    <View className="rounded-xl bg-white py-4 px-4 mb-4">
      <View className="flex-row items-center justify-between mt-2">
        <View
          className="flex-row items-center px-3 py-1.5 rounded-full"
          style={{ backgroundColor: category.color + '20' }}
        >
          <MaterialIcons
            name={category.icon}
            size={16}
            color={category.color}
            style={{ marginRight: 6 }}
          />
          <Text
            className="text-sm font-semibold"
            style={{ color: category.color }}
          >
            {category.label}
          </Text>
        </View>
        <Text className="text-sm text-gray-500">
          {formatTimeAgo(createdAt)}
        </Text>
      </View>
    </View>
  );

  return onEditCategory ? (
    <TouchableOpacity activeOpacity={0.7} onPress={onEditCategory}>
      {box}
    </TouchableOpacity>
  ) : (
    box
  );
}

/** Budget line — whole card pressable to edit (when owned) */
function BudgetRow({
  budget,
  budgetType,
  currencySymbol = '₱',
  onEditBudget,
}: {
  budget: number;
  budgetType: string;
  currencySymbol?: string;
  onEditBudget?: () => void;
}) {
  const box = (
    <View className="flex-row items-center justify-between rounded-xl bg-white py-4 px-4 mb-4">
      <Text className="text-base font-bold text-gray-900">Reward</Text>
      <View className="flex-row items-center">
        <Text className="text-2xl font-bold text-emerald-600">
          {formatBudget(
            budget,
            budgetType as 'fixed' | 'hourly' | 'negotiable',
            currencySymbol,
          )}
        </Text>
      </View>
    </View>
  );

  return onEditBudget ? (
    <TouchableOpacity activeOpacity={0.7} onPress={onEditBudget}>
      {box}
    </TouchableOpacity>
  ) : (
    box
  );
}

/** Duration line — whole card pressable to edit (when owned) */
function DurationRow({
  durationValue,
  durationUnit,
  onEditDuration,
}: {
  durationValue?: number;
  durationUnit?: string;
  onEditDuration?: () => void;
}) {
  const label = formatDuration(durationValue, durationUnit);

  const box = (
    <View className="flex-row items-center justify-between rounded-xl bg-white py-4 px-4 mb-4">
      <Text className="text-base font-bold text-gray-900">Duration</Text>
      <View className="flex-row items-center">
        <MaterialIcons
          name="schedule"
          size={18}
          color="#6B7280"
          style={{ marginRight: 6 }}
        />
        <Text className="text-lg font-semibold text-gray-900">
          {label || 'Not set'}
        </Text>
      </View>
    </View>
  );

  return onEditDuration ? (
    <TouchableOpacity activeOpacity={0.7} onPress={onEditDuration}>
      {box}
    </TouchableOpacity>
  ) : (
    box
  );
}

/** Format a duration value + unit for display (e.g., "3 days", "1 day"). */
function formatDuration(value?: number, unit?: string): string {
  if (value == null || value <= 0 || !unit) return '';
  const unitLabel = value === 1 ? unit.replace(/s$/, '') : unit;
  return `${value.toLocaleString()} ${unitLabel}`;
}

/** Location line — whole row pressable. When owned it edits the location,
 *  otherwise it opens the map centered on the work location. */
function LocationRow({
  location,
  distance,
  onLocationPress,
  onEditLocation,
}: {
  location: string;
  distance?: string;
  onLocationPress?: () => void;
  onEditLocation?: () => void;
}) {
  const pressHandler = onEditLocation ?? onLocationPress;

  return (
    <TouchableOpacity
      className="flex-row items-center mb-4 mt-2"
      activeOpacity={0.7}
      onPress={pressHandler}
      disabled={!pressHandler}
      accessibilityRole={pressHandler ? 'button' : undefined}
    >
      <View className="flex-1 flex-row items-center bg-gray-100 bottom-1 border border-gray-200 rounded-xl p-2">
        <View className="flex-1 px-2 flex-row items-center">
          <View className="">
            <MaterialIcons name="location-on" size={22} color="#4b5563" />
          </View>
          <View className="px-4">
            <Text className="text-base text-gray-600">{location}</Text>
          </View>
        </View>
        {distance && (
          <>
            <Text className="text-sm text-gray-400 mx-2">•</Text>
            <Text className="text-sm text-gray-600">📏 {distance}</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

/** Scheduled date card */
function ScheduledDateCard({ dateStr }: { dateStr?: string }) {
  if (!dateStr) return null;
  const formatted = formatScheduledDate(dateStr);
  if (!formatted) return null;

  return (
    <View className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
      <Text className="text-sm font-semibold text-blue-900 mb-1">
        📅 Scheduled Date
      </Text>
      <Text className="text-base text-blue-700">{formatted}</Text>
    </View>
  );
}

/** Description card — whole card pressable to edit (when owned) */
function DescriptionCard({
  text,
  onEditDescription,
}: {
  text: string;
  onEditDescription?: () => void;
}) {
  const box = (
    <View className="rounded-xl bg-white p-4 mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-base font-bold text-gray-900">Description</Text>
      </View>
      <Text className="text-lg text-gray-700 leading-5">{text}</Text>
    </View>
  );

  return onEditDescription ? (
    <TouchableOpacity activeOpacity={0.7} onPress={onEditDescription}>
      {box}
    </TouchableOpacity>
  ) : (
    box
  );
}

/** Tags list — whole card pressable to edit (when owned) */
function TagsCard({
  tags,
  onEditTags,
}: {
  tags: string[];
  onEditTags?: () => void;
}) {
  if ((!tags || tags.length === 0) && !onEditTags) return null;

  const box = (
    <View className="bg-white rounded-xl p-4 mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-base font-bold text-gray-900">Tags</Text>
        {onEditTags && (
          <TouchableOpacity
            onPress={onEditTags}
            className="flex-row items-center"
            activeOpacity={0.7}
          >
            <MaterialIcons name="edit" size={16} color="#059669" />
            <Text className="text-sm font-semibold text-emerald-600 ml-1">
              Edit
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {!tags || tags.length === 0 ? (
        <Text className="text-sm text-gray-400 py-1">
          No tags yet. Tap to add some.
        </Text>
      ) : (
        <View className="flex-row flex-wrap">
          {tags.map((tag, index) => (
            <View
              key={index}
              className="bg-gray-100 px-3 py-1.5 rounded-full mr-2 mb-2"
            >
              <Text className="text-sm text-gray-700">{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return onEditTags ? (
    <TouchableOpacity activeOpacity={0.7} onPress={onEditTags}>
      {box}
    </TouchableOpacity>
  ) : (
    box
  );
}
/**
 * Interested list — the people who opened a conversation about this work.
 * Each row is tappable and opens that work's conversation.
 */
function InterestedSection({
  items,
  onPress,
  acceptedUserIds,
  onAccept,
}: {
  items: ConversationPreview[];
  onPress: (c: ConversationPreview) => void;
  acceptedUserIds?: string[];
  onAccept?: (userId: string, userName: string) => void;
}) {
  return (
    <View className="bg-white rounded-xl p-4 mb-6">
      <View className="flex-row items-center mb-3">
        <Text className="text-base font-bold text-gray-900">Interested</Text>
        <View className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5">
          <Text className="text-xs font-semibold text-emerald-700">
            {items.length}
          </Text>
        </View>
      </View>

      {items.length === 0 ? (
        <Text className="text-sm text-gray-400">
          No responses yet. Share your work to get people interested.
        </Text>
      ) : (
        items.map((c, index) => {
          const name = c.partner?.name || 'Unknown';
          const isLast = index === items.length - 1;
          const isAcceptedCandidate =
            c.partner?.id && acceptedUserIds?.includes(c.partner.id);
          return (
            <View
              key={c.id}
              className={`py-4 ${isLast ? '' : 'border-b border-gray-100'}`}
            >
              <TouchableOpacity
                onPress={() => onPress(c)}
                activeOpacity={0.7}
                className="flex-row items-center"
                accessibilityRole="button"
              >
                {c.partner?.photo ? (
                  <Image
                    source={{ uri: c.partner.photo }}
                    className="w-11 h-11 rounded-full bg-gray-100 mr-3"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-11 h-11 rounded-full bg-emerald-100 items-center justify-center mr-3">
                    <Text className="text-base font-bold text-emerald-600">
                      {name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View className="flex-1 mr-2">
                  <View className="flex-row items-center">
                    <Text className="text-base font-semibold text-gray-900">
                      {name}
                    </Text>
                    {isAcceptedCandidate && (
                      <View className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 flex-row items-center">
                        <MaterialIcons name="check" size={10} color="#047857" />
                        <Text className="text-[10px] font-bold text-emerald-700 ml-0.5">
                          Accepted
                        </Text>
                      </View>
                    )}
                  </View>
                  {c.partner?.email ? (
                    <Text
                      className="text-sm text-gray-500 mt-0.5"
                      numberOfLines={1}
                    >
                      {maskEmail(c.partner.email)}
                    </Text>
                  ) : null}
                </View>
                {!isAcceptedCandidate && onAccept && c.partner?.id && (
                  <TouchableOpacity
                    onPress={() => onAccept(c.partner!.id, name)}
                    className="bg-emerald-600 rounded-lg px-4 py-2 flex-row items-center"
                    activeOpacity={0.8}
                  >
                    <MaterialIcons
                      name="assignment-ind"
                      size={14}
                      color="#FFF"
                    />
                    <Text className="text-white text-xs font-bold ml-1">
                      accept
                    </Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </View>
  );
}

/** Poster profile card */
function PosterCard({
  name,
  photo,
  email,
  postedBy,
  verifiedAt,
  onPress,
}: {
  name: string;
  photo?: string | null;
  email?: string;
  postedBy?: string;
  verifiedAt?: string | null;
  onPress?: () => void;
}) {
  const { user } = useAuthStore();
  if (user?.id === postedBy) return null;

  const inner = (
    <View className="flex-row items-center">
      {photo ? (
        <Image
          source={{ uri: photo }}
          style={{ width: 48, height: 48, borderRadius: 24 }}
          className="mr-3 bg-gray-200"
        />
      ) : (
        <View className="w-12 h-12 rounded-full bg-emerald-100 items-center justify-center mr-3">
          <Text className="text-base font-bold text-emerald-600">
            {(name || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View className="flex-1">
        <View className="flex-row items-center flex-wrap">
          <Text className="text-base font-bold text-gray-900 mr-2">{name}</Text>
          {verifiedAt ? <VerifiedBadge showLabel /> : null}
        </View>
        {email && maskEmail(email) && (
          <View className="flex-row items-center mt-1">
            <MaterialIcons name="email" size={14} color="#6B7280" />
            <Text className="text-sm text-gray-500 ml-1">
              {maskEmail(email)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View className="bg-white rounded-xl p-4 mb-6">
      <Text className="text-base font-bold text-gray-900 mb-3">Posted By</Text>
      {onPress ? (
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`View ${name || 'poster'}'s profile`}
        >
          {inner}
        </TouchableOpacity>
      ) : (
        inner
      )}
    </View>
  );
}

/** Contact mobile number row */
function MobileNumberRow({
  contactPhone,
  phoneCountryCode,
  onEditMobile,
  onCallMobile,
}: {
  contactPhone?: string;
  phoneCountryCode?: string;
  onEditMobile?: () => void;
  onCallMobile?: () => void;
}) {
  const hasPhone = !!contactPhone;
  const displayValue = hasPhone
    ? contactPhone.startsWith('+')
      ? contactPhone
      : `+${phoneCountryCode || '63'}${contactPhone}`
    : 'Not set';

  const box = (
    <View className="flex-row items-center justify-between rounded-xl bg-white py-4 px-4 mb-4">
      <View className="flex-row items-center flex-1">
        <MaterialIcons
          name="phone"
          size={20}
          color={hasPhone ? '#059669' : '#9CA3AF'}
          style={{ marginRight: 12 }}
        />
        <View className="flex-1">
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Contact Number
          </Text>
          <Text
            className={`text-base font-semibold mt-0.5 ${
              hasPhone ? 'text-emerald-700' : 'text-gray-400 italic'
            }`}
          >
            {displayValue}
          </Text>
        </View>
      </View>
      {onEditMobile && (
        <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
      )}
      {!onEditMobile && hasPhone && onCallMobile && (
        <View className="bg-emerald-100 rounded-full px-3 py-1.5 flex-row items-center">
          <MaterialIcons name="phone" size={14} color="#059669" />
          <Text className="text-xs font-bold text-emerald-700 ml-1">Call</Text>
        </View>
      )}
    </View>
  );

  if (onEditMobile) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onEditMobile}>
        {box}
      </TouchableOpacity>
    );
  }

  if (hasPhone && onCallMobile) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onCallMobile}>
        {box}
      </TouchableOpacity>
    );
  }

  if (!hasPhone) return null;

  return box;
}

// ---------------------------------------------------------------------------
// Main content component
// ---------------------------------------------------------------------------

export interface WorkDetailData {
  images: string[];
  category: string;
  createdAt: string;
  budget: number;
  budgetType: string;
  currency?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  distance?: string;
  scheduledDate?: string;
  durationValue?: number;
  durationUnit?: string;
  description: string;
  tags: string[];
  contactPhone?: string;
  phoneCountryCode?: string;
  postedBy: {
    id: string;
    name: string;
    photo?: string | null;
    email?: string;
    verifiedAt?: string | null;
  };
  acceptedUserIds?: string[];
  workTypeImage?: string;
}

interface Props {
  work: WorkDetailData;
  matchedWorkType?: WorkType;
  onImagePress: (index: number) => void;
  onLocationPress?: () => void;
  onEditLocation?: () => void;
  onEditBudget?: () => void;
  onEditDescription?: () => void;
  onEditCategory?: () => void;
  onEditDuration?: () => void;
  onEditImages?: () => void;
  onEditTags?: () => void;
  onEditMobile?: () => void;
  onCallMobile?: () => void;
  interested?: ConversationPreview[];
  onInterestedPress?: (c: ConversationPreview) => void;
  onAcceptPress?: (userId: string, userName: string) => void;
  onPosterProfile?: () => void;
}

export function WorkDetailContent({
  work,
  matchedWorkType,
  onImagePress,
  onLocationPress,
  onEditLocation,
  onEditBudget,
  onEditDescription,
  onEditCategory,
  onEditDuration,
  onEditImages,
  onEditTags,
  onEditMobile,
  onCallMobile,
  interested,
  onInterestedPress,
  onAcceptPress,
  onPosterProfile,
}: Props) {
  const currencySymbol = useWorkCurrency(work);
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 20 }}
      showsVerticalScrollIndicator={false}
    >
      {/* WorkType banner image */}
      {!work?.images?.length && matchedWorkType && (
        <View className="mb-2 relative">
          <Image
            source={{
              uri: `${MINIO_ENDPOINT}${matchedWorkType!.image}`,
            }}
            style={{ width: '100%', height: 120, borderRadius: 12 }}
            resizeMode="cover"
          />
          {onEditImages && (
            <TouchableOpacity
              onPress={onEditImages}
              className="absolute right-3 bottom-3 bg-black/60 rounded-full px-4 py-2.5 flex-row items-center border border-white/30 shadow-lg"
              activeOpacity={0.8}
            >
              <MaterialIcons name="add-a-photo" size={16} color="#FFF" />
              <Text className="text-white text-xs font-bold ml-1.5">
                Add Photos
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {work?.images?.length > 0 && (
        <View className="mb-2 relative">
          {isVideoUrl(work?.images?.[0]) ? (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => playVideo(work?.images?.[0])}
              style={{ width: '100%', height: 120, borderRadius: 12 }}
              className="bg-gray-950 items-center justify-center relative overflow-hidden"
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
              <View className="absolute bottom-2 left-2 flex-row items-center bg-black/70 rounded px-2 py-0.5">
                <MaterialIcons name="videocam" size={12} color="#10B981" />
                <Text className="text-white text-[10px] font-bold ml-1">
                  PLAY VIDEO
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <Pressable onPress={() => onImagePress(0)}>
              <Image
                source={{
                  uri: work?.images?.[0],
                }}
                style={{ width: '100%', height: 120, borderRadius: 12 }}
                resizeMode="cover"
              />
            </Pressable>
          )}
        </View>
      )}
      <LocationRow
        location={work.location}
        distance={work.distance}
        onLocationPress={onLocationPress}
        onEditLocation={onEditLocation}
      />
      <MobileNumberRow
        contactPhone={work.contactPhone}
        phoneCountryCode={work.phoneCountryCode}
        onEditMobile={onEditMobile}
        onCallMobile={onCallMobile}
      />
      <WorkPictureRow
        images={work.images}
        onImagePress={onImagePress}
        onEditImages={onEditImages}
      />
      <CategoryRow
        categorySlug={work.category}
        workType={matchedWorkType}
        createdAt={work.createdAt}
        onEditCategory={onEditCategory}
      />
      <BudgetRow
        budget={work.budget}
        budgetType={work.budgetType}
        currencySymbol={currencySymbol}
        onEditBudget={onEditBudget}
      />
      <DurationRow
        durationValue={work.durationValue}
        durationUnit={work.durationUnit}
        onEditDuration={onEditDuration}
      />
      <ScheduledDateCard dateStr={work.scheduledDate} />
      <DescriptionCard
        text={work.description}
        onEditDescription={onEditDescription}
      />
      <TagsCard tags={work.tags} onEditTags={onEditTags} />
      {interested && onInterestedPress && (
        <InterestedSection
          items={interested}
          onPress={onInterestedPress}
          acceptedUserIds={work.acceptedUserIds}
          onAccept={onAcceptPress}
        />
      )}
      <PosterCard
        postedBy={work.postedBy.id}
        name={work.postedBy.name}
        photo={work.postedBy.photo}
        email={work.postedBy.email}
        verifiedAt={work.postedBy.verifiedAt}
        onPress={onPosterProfile}
      />
    </ScrollView>
  );
}
