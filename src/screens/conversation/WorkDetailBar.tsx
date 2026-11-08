import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useWork } from '../../hooks/useWorks';
import { useWorkCurrency, useWorkTypes } from '../../hooks';
import { getCategoryInfo, workTypeToCategoryInfo } from '../../constants';
import { HomeStackParamList, WorkStatus } from '../../types';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'ConversationDetail'>;

interface Props {
  workId: string;
}

const STATUS_CONFIG: Record<
  WorkStatus,
  { label: string; bg: string; text: string }
> = {
  open: { label: 'Open', bg: 'bg-green-100', text: 'text-green-700' },
  in_progress: {
    label: 'In Progress',
    bg: 'bg-blue-100',
    text: 'text-blue-700',
  },
  completed: { label: 'Completed', bg: 'bg-gray-100', text: 'text-gray-600' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-100', text: 'text-red-600' },
};

function formatBudget(
  budget: number,
  budgetType: string,
  currencySymbol = '₱',
): string {
  if (budgetType === 'hourly') {
    return `${currencySymbol}${budget}/hr`;
  }
  if (budgetType === 'negotiable') {
    return 'Negotiable';
  }
  return `${currencySymbol}${budget}`;
}

export function WorkDetailBar({ workId }: Props): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const { data: result, isLoading, isError } = useWork(workId);
  const { data: workTypes } = useWorkTypes();
  const work = result?.status === 'found' ? result.work : undefined;
  const currencySymbol = useWorkCurrency(work);

  if (isLoading) {
    return (
      <View className="px-4 py-3 bg-white border-b border-gray-100">
        <View className="flex-row items-center">
          <ActivityIndicator size="small" color="#6B7280" />
          <Text className="text-sm text-gray-400 ml-2">
            Loading work details...
          </Text>
        </View>
      </View>
    );
  }

  if (isError || !work) {
    // Silently render nothing if we can't fetch the work
    return <></>;
  }

  const category = workTypeToCategoryInfo(
    workTypes?.find(j => j.slug === work.category),
    getCategoryInfo(work.category),
  );
  const status = STATUS_CONFIG[work.status] ?? STATUS_CONFIG.open;
  const displayTitle = work.title || category.label;
  const budgetText = formatBudget(work.budget, work.budgetType, currencySymbol);

  return (
    <TouchableOpacity
      className="bg-white border-b border-gray-100"
      activeOpacity={0.7}
      onPress={() => navigation.navigate('WorkDetail', { workId: work.id })}
    >
      <View className="flex-row items-center px-4 py-3">
        {/* Colored accent strip */}
        <View
          className="w-1 h-10 rounded-full mr-3"
          style={{ backgroundColor: category.color }}
        />

        {/* Work info */}
        <View className="flex-1 mr-2">
          <View className="flex-row items-center">
            <Text
              className="text-base font-semibold text-gray-900"
              numberOfLines={1}
            >
              {displayTitle}
            </Text>
            {/* Status badge */}
            <View className={`ml-2 px-2 py-0.5 rounded-full ${status.bg}`}>
              <Text className={`text-xs font-medium ${status.text}`}>
                {status.label}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center mt-0.5">
            <MaterialIcons
              name={category.icon}
              size={14}
              color={category.color}
              style={{ marginRight: 6 }}
            />
            <Text className="text-xs text-gray-500">{category.label}</Text>
            <Text className="text-xs text-gray-300 mx-1.5">·</Text>
            <Text className="text-xs text-gray-500 font-medium">
              {budgetText}
            </Text>
          </View>
        </View>

        {/* Chevron */}
        <MaterialIcons name="chevron-right" size={20} color="#D1D5DB" />
      </View>
    </TouchableOpacity>
  );
}
