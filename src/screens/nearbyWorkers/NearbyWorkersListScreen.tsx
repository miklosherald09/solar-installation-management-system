/**
 * NearbyWorkersListScreen
 * Full-screen list of all workers near the user's configured near-me location.
 * Reached from the tappable "Workers near you" header on the home feed.
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNearbyWorkers, useWorkTypes } from '../../hooks';
import { getCategoryInfo, workTypeToCategoryInfo } from '../../constants';
import { Avatar } from '../../components/Avatar';
import { CredibilityBadge } from '../../components/CredibilityBadge';
import { Skeleton } from '../../components/Skeleton';
import { HomeStackParamList, WorkCategory, WorkType } from '../../types';
import type { NearbyWorker } from '../../services/nearbyWorkersService';
import { usePresenceStore } from '../../store';
import { cn } from '../../utils';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'NearbyWorkersList'>;
type Route = RouteProp<HomeStackParamList, 'NearbyWorkersList'>;

function WorkerRow({
  worker,
  workTypes,
  onPress,
}: {
  worker: NearbyWorker;
  workTypes?: WorkType[];
  onPress: () => void;
}) {
  const workerPresence = usePresenceStore(
    React.useCallback(
      state => (worker.id ? state.presences[worker.id] : undefined),
      [worker.id],
    ),
  );

  const isOnline =
    workerPresence !== undefined
      ? workerPresence.isOnline || workerPresence.status === 'ONLINE'
      : worker.isOnline === true;

  const isBusy =
    workerPresence !== undefined ? workerPresence.status === 'BUSY' : false;

  // Capable work types are slugs (e.g. "cleaning", "driver") — map them to
  // human-readable labels (e.g. "Cleaning, Driver") and surface any leftovers.
  const capableList = worker.capableWorkTypes ?? [];
  const skillLabels = capableList.slice(0, 2).map(slug => {
    const workType = workTypes?.find(wt => wt.slug === slug);
    return workTypeToCategoryInfo(
      workType,
      getCategoryInfo(slug as WorkCategory),
    ).label;
  });
  const extraCount = capableList.length > 2 ? capableList.length - 2 : 0;
  const skills =
    skillLabels.length > 0
      ? `${skillLabels.join(', ')}${extraCount ? ` +${extraCount} more` : ''}`
      : undefined;

  return (
    <TouchableOpacity
      className="flex-row items-center py-3 px-1 border-b border-gray-100"
      activeOpacity={0.6}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${worker.name}'s profile`}
    >
      {/* Avatar with online dot */}
      <View className="relative">
        <Avatar photo={worker.photo} size={48} />
        {isOnline ? (
          <View
            className={cn(
              'absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white',
              isBusy ? 'bg-amber-500' : 'bg-emerald-500',
            )}
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 14,
              height: 14,
              borderRadius: 7,
              borderWidth: 2,
              borderColor: '#FFFFFF',
              backgroundColor: isBusy ? '#F59E0B' : '#10B981',
            }}
          />
        ) : null}
      </View>

      <View className="flex-1 ml-3">
        <Text
          className="text-base font-semibold text-gray-800"
          numberOfLines={1}
        >
          {worker.name}
        </Text>

        <View className="flex-row items-center mt-0.5">
          <Text className="text-xs text-emerald-700 font-semibold mr-1.5">
            {worker.distance}
          </Text>
          {worker.credibility?.reviewCount ? (
            <CredibilityBadge
              rating={worker.credibility.avgRating}
              reviewCount={worker.credibility.reviewCount}
              compact
            />
          ) : null}
        </View>

        {skills ? (
          <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>
            {skills}
          </Text>
        ) : null}
      </View>

      <MaterialIcons name="chevron-right" size={20} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

function ListSkeleton() {
  return (
    <View className="px-5 pt-2">
      {[0, 1, 2, 3, 4, 5].map(i => (
        <View
          key={i}
          className="flex-row items-center py-3 border-b border-gray-100"
        >
          <Skeleton
            className="rounded-full"
            style={{ width: 48, height: 48 }}
          />
          <View className="flex-1 ml-3">
            <Skeleton className="h-4 w-2/3 rounded" />
            <Skeleton className="h-3 w-1/3 rounded mt-2" />
          </View>
        </View>
      ))}
    </View>
  );
}
export function NearbyWorkersListScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();

  const { latitude, longitude, rangeKm, conciseLocation, location } =
    route.params;
  const nearMe = { latitude, longitude, rangeKm };

  const {
    data: workers,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useNearbyWorkers(nearMe);
  const { data: workTypes } = useWorkTypes();

  const locationLabel = conciseLocation || location || 'your area';

  return (
    <View className="flex-1 bg-gray-50">
      <View style={{ height: insets.top }} className="bg-white" />

      {/* Header */}
      <View className="bg-white px-4 pb-3 border-b border-gray-100">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="flex-row items-center"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          activeOpacity={0.7}
        >
          <View className="mr-3 p-1.5 rounded-full">
            <MaterialIcons name="arrow-back" size={24} color="#111827" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>
              Workers near you
            </Text>
            <Text
              className="text-xs text-gray-500 font-medium mt-0.5"
              numberOfLines={1}
            >
              {locationLabel} • {rangeKm} km
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <MaterialIcons name="error-outline" size={48} color="#9CA3AF" />
          <Text className="text-base text-gray-500 text-center mt-3">
            Could not load nearby workers.
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            className="mt-4 px-4 py-2 bg-emerald-700 rounded-full active:opacity-90"
          >
            <Text className="text-white font-semibold text-sm">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !workers || workers.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-3">
            <MaterialIcons name="groups" size={28} color="#9CA3AF" />
          </View>
          <Text className="text-base font-semibold text-gray-800 text-center">
            No workers nearby
          </Text>
          <Text className="text-sm text-gray-500 text-center mt-1">
            Try increasing your Near Me range.
          </Text>
        </View>
      ) : (
        <FlatList
          data={workers}
          keyExtractor={item => item.id}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 32,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={['#006742']}
              tintColor="#006742"
            />
          }
          renderItem={({ item }) => (
            <WorkerRow
              worker={item}
              workTypes={workTypes}
              onPress={() =>
                navigation.navigate('UserProfile', { userId: item.id })
              }
            />
          )}
        />
      )}
    </View>
  );
}
