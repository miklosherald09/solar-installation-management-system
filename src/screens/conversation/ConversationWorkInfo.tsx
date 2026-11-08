import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useWork, useAcceptApplicant } from '../../hooks/useWorks';
import { useWorkCurrency, useWorkTypes } from '../../hooks';
import { useAuthStore } from '../../store/useAuthStore';
import { getCategoryInfo, workTypeToCategoryInfo } from '../../constants';
import { MessagesStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<
  MessagesStackParamList,
  'ConversationDetail'
>;

interface Props {
  workId: string;
  partnerId?: string;
  partnerName?: string;
}

function formatBudget(
  budget: number,
  budgetType: string,
  currencySymbol = '₱',
): string {
  if (budgetType === 'hourly') return `${currencySymbol}${budget}/hr`;
  if (budgetType === 'negotiable') return 'Negotiable';
  return `${currencySymbol}${budget}`;
}

/** Compact work details shown inline inside the conversation header. */
export function ConversationWorkInfo({
  workId,
  partnerId,
  partnerName,
}: Props): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const { data: result, isLoading, isError } = useWork(workId);
  const { user } = useAuthStore();
  const { mutateAsync: acceptApplicant } = useAcceptApplicant();

  // Hooks must be called unconditionally on every render (Rules of Hooks), so
  // useWorkTypes is invoked here at the top alongside the other hooks — never
  // after an early return.
  const { data: workTypes } = useWorkTypes();

  // Resolve the work object (may be undefined while loading / if the work
  // cannot be found) so the currency hook below is invoked unconditionally on
  // every render, satisfying the Rules of Hooks (no hooks after early returns).
  const currencyWork = result?.status === 'found' ? result.work : undefined;
  const currencySymbol = useWorkCurrency(currencyWork);

  if (isLoading) {
    return (
      <View className="px-4 py-2 border-t border-gray-100">
        <View className="flex-row items-center">
          <ActivityIndicator size="small" color="#9CA3AF" />
          <Text className="text-xs text-gray-400 ml-2">
            Loading work details...
          </Text>
        </View>
      </View>
    );
  }

  // Only show "Work was removed" when the backend confirms the work was
  // soft-deleted in the database (HTTP 410 / status 'removed'). A work that
  // simply does not exist at all renders nothing.
  if (result?.status === 'removed') {
    return (
      <View className="flex-row items-center px-6 py-2.5">
        <MaterialIcons name="cancel" size={18} color="#A8A8B7" />
        <Text
          className="text-md ml-2 font-semibold text-gray-900 flex-shrink"
          numberOfLines={1}
        >
          Work was removed
        </Text>
      </View>
    );
  }

  if (isError) {
    return <></>;
  }

  if (result?.status !== 'found') {
    return <></>;
  }

  // From here on the work is guaranteed to exist (status === 'found').
  const work = result.work;

  const workType = workTypes?.find(w => w.slug === work.category);
  const category = workTypeToCategoryInfo(
    workType,
    getCategoryInfo(work.category),
  );

  const displayTitle = work.title || category.label;
  const budgetText = formatBudget(work.budget, work.budgetType, currencySymbol);

  const isOwnWork = user?.id === work.postedBy.id;

  const isCandidateAccepted =
    partnerId && work.acceptedUserIds?.includes(partnerId);

  const handleAccept = () => {
    const candidateName = partnerName || 'this candidate';
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
                userId: partnerId!,
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

  return (
    <View className="border-t border-gray-100 bg-white">
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('WorkDetail', {
            workId: work.id,
            origin: 'conversation',
          })
        }
      >
        <View className="flex-row items-center px-6 py-2.5">
          <MaterialIcons
            name={category.icon}
            size={18}
            color={category.color}
          />
          <Text
            className="text-md ml-2 font-semibold text-gray-900 flex-shrink"
            numberOfLines={1}
          >
            {displayTitle}
          </Text>
          <Text className="text-lg font-semibold text-emerald-800 ml-2">
            {budgetText}
          </Text>
          {/* Push budget to the right */}
          <View className="flex-1" />
          {/* Accept button row for work owner */}
          {isOwnWork && partnerId && (
            <View className="flex-row items-center justify-between">
              {isCandidateAccepted ? (
                <View className="bg-emerald-100 rounded-full px-2.5 py-0.5 flex-row items-center">
                  <MaterialIcons name="check" size={12} color="#047857" />
                  <Text className="text-[11px] font-bold text-emerald-700 ml-1">
                    Accepted
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleAccept}
                  className="bg-emerald-600 rounded-lg px-3 py-1.5 flex-row items-center shadow-sm"
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="assignment-ind" size={14} color="#FFF" />
                  <Text className="text-white text-xs font-bold ml-1">
                    Accept
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}
