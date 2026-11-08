import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getInitials } from '../conversation/helpers';
import { maskEmail } from '../../utils';
import { CredibilityBadge } from '../../components/CredibilityBadge';
import { VerifiedBadge } from '../../components/VerifiedBadge';
import { useCredibility } from '../../hooks/useReviews';
import { useAuthStore } from '../../store/useAuthStore';
import { HomeStackParamList } from '../../types';
import { UserButtonCard } from './UserButtonCard';

type Nav = NativeStackNavigationProp<HomeStackParamList>;

interface UserProfileHeroCardProps {
  user: any;
  isSelf: boolean;
  checkingConvo: boolean;
  onMessagePress: () => void;
  onCallPress?: () => void;
}

export function UserProfileHeroCard({
  user,
  isSelf,
  checkingConvo,
  onMessagePress,
  onCallPress,
}: UserProfileHeroCardProps): React.JSX.Element {
  const { data: credibility } = useCredibility(user?.id);
  const { user: authUser } = useAuthStore();
  const isOwn = user?.id === authUser?.id;
  const navigation = useNavigation<Nav>();

  const isVerified = Boolean(
    user?.verifiedAt || (isOwn && authUser?.verifiedAt),
  );

  const handleReviewsPress = () => {
    if (user?.id) {
      navigation.navigate('UserReviews', { userId: user.id });
    }
  };

  return (
    <View className="bg-white mt-4 rounded-2xl p-6 border border-gray-200">
      <View className="flex-row">
        <View className="">
          {user?.photo ? (
            <Image
              source={{ uri: user.photo }}
              style={{ width: 88, height: 88, borderRadius: 44 }}
              className="bg-gray-200"
            />
          ) : (
            <View className="w-20 h-20 rounded-full bg-emerald-100 items-center justify-center">
              <Text className="text-3xl font-bold text-emerald-600">
                {getInitials(user?.name || '?')}
              </Text>
            </View>
          )}
        </View>
        <View className="ml-4 flex-1">
          <View className="flex-row items-center flex-wrap mt-3">
            <Text
              className="text-xl font-bold text-gray-900 mr-2"
              numberOfLines={1}
            >
              {user?.name ?? 'Partner'}
            </Text>
            {isVerified && <VerifiedBadge showLabel />}
          </View>
          {user?.email ? (
            <Text className="text-sm text-gray-500 mt-1">
              {isOwn ? user.email : maskEmail(user.email)}
            </Text>
          ) : null}
          {/* Credibility badge — tappable to see all reviews */}
          {credibility && (
            <TouchableOpacity
              className="mt-2"
              activeOpacity={0.7}
              onPress={handleReviewsPress}
              accessibilityRole="button"
              accessibilityLabel="View all reviews"
            >
              <CredibilityBadge
                rating={credibility.avgRating}
                reviewCount={credibility.reviewCount}
                completedWorks={credibility.completedWorks}
                showWorks
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <UserButtonCard
        isSelf={isSelf}
        checkingConvo={checkingConvo}
        onMessagePress={onMessagePress}
        onCallPress={onCallPress}
      />
    </View>
  );
}
