/**
 * UserReviewsScreen
 * Displays a paginated list of reviews for a user, with work context
 * (category + description) alongside each review to give them credibility.
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeStackParamList } from '../../types';
import { useUserReviews } from '../../hooks/useReviews';
import { ReviewData } from '../../services/reviewService';
import { useHideTabBar } from '../../navigation/useHideTabBar';
import { getInitials } from '../conversation/helpers';
import { getCategoryInfo } from '../../constants';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'UserReviews'>;
type Route = RouteProp<HomeStackParamList, 'UserReviews'>;

function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30)
    return `${Math.floor(diffDays / 7)} week${
      Math.floor(diffDays / 7) > 1 ? 's' : ''
    } ago`;
  if (diffDays < 365)
    return `${Math.floor(diffDays / 30)} month${
      Math.floor(diffDays / 30) > 1 ? 's' : ''
    } ago`;
  return `${Math.floor(diffDays / 365)} year${
    Math.floor(diffDays / 365) > 1 ? 's' : ''
  } ago`;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <View className="flex-row items-center">
      {[1, 2, 3, 4, 5].map(i => (
        <MaterialIcons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={14}
          color={i <= rating ? '#F59E0B' : '#D1D5DB'}
        />
      ))}
    </View>
  );
}

function ReviewItem({ review }: { review: ReviewData }) {
  const categoryInfo = review.work?.category
    ? getCategoryInfo(review.work.category as any)
    : null;

  return (
    <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100">
      {/* Work context badge */}
      {review.work && (
        <View className="flex-row items-center mb-3 bg-gray-50 rounded-lg px-3 py-2">
          {categoryInfo && (
            <MaterialIcons
              name={categoryInfo.icon as any}
              size={16}
              color={categoryInfo.color}
            />
          )}
          <Text
            className="text-xs text-gray-600 font-medium ml-1.5 flex-1"
            numberOfLines={1}
          >
            {categoryInfo?.label || review.work.category}
          </Text>
        </View>
      )}

      {/* Reviewer info */}
      <View className="flex-row items-start">
        {review.reviewer?.photo ? (
          <Image
            source={{ uri: review.reviewer.photo }}
            style={{ width: 36, height: 36, borderRadius: 18 }}
            className="bg-gray-200"
          />
        ) : (
          <View className="w-9 h-9 rounded-full bg-emerald-100 items-center justify-center">
            <Text className="text-sm font-bold text-emerald-600">
              {getInitials(review.reviewer?.name || '?')}
            </Text>
          </View>
        )}
        <View className="ml-3 flex-1">
          <View className="flex-row items-center justify-between">
            <Text
              className="text-sm font-semibold text-gray-900"
              numberOfLines={1}
            >
              {review.reviewer?.name || 'Anonymous'}
            </Text>
            <Text className="text-xs text-gray-400">
              {formatRelativeDate(review.createdAt)}
            </Text>
          </View>
          <View className="mt-0.5">
            <StarRow rating={review.rating} />
          </View>
          {review.comment ? (
            <Text className="text-sm text-gray-700 mt-2 leading-5">
              {review.comment}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function UserReviewsScreen(): React.JSX.Element {
  useHideTabBar();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { userId } = route.params;

  const { data, isLoading } = useUserReviews(userId, 0, 100);
  const reviews = data?.reviews ?? [];
  const total = data?.total ?? 0;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200">
        <View style={{ height: insets.top }} className="bg-white" />
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mr-3 p-1.5 rounded-full"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialIcons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900">Reviews</Text>
            {total > 0 && (
              <Text className="text-xs text-gray-400">{total} total</Text>
            )}
          </View>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ReviewItem review={item} />}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 40,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <MaterialIcons name="rate-review" size={48} color="#D1D5DB" />
              <Text className="text-base text-gray-400 mt-4">
                No reviews yet
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
