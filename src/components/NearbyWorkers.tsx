/**
 * NearbyWorkers
 * Horizontal scrollable strip showing workers near the user's location.
 * Each item shows the worker's avatar (with online indicator and capable
 * work type badge on top), first name, and distance. Tapping navigates to their profile.
 *
 * Only renders when the near-me filter is active and workers are found.
 */

import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Avatar } from './Avatar';
import { Skeleton } from './Skeleton';
import { useNearbyWorkers } from '../hooks/useNearbyWorkers';
import { useWorkTypes } from '../hooks';
import { getCategoryInfo, workTypeToCategoryInfo } from '../constants';
import type { NearbyWorker } from '../services/nearbyWorkersService';
import type { HomeStackParamList, WorkCategory, WorkType } from '../types';

import { useAuthStore } from '../store/useAuthStore';
import { usePresenceStore } from '../store';
import { cn } from '../utils';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

interface NearMeFilter {
  latitude: number;
  longitude: number;
  rangeKm: number;
  conciseLocation?: string;
  location?: string;
}

interface Props {
  nearMeFilter?: NearMeFilter;
  onNearMePress?: () => void;
  showWorksNearYouLink?: boolean;
}

const AVATAR_SIZE = 52;

function WorkerItem({
  worker,
  workTypes,
}: {
  worker: NearbyWorker;
  workTypes?: WorkType[];
}) {
  const navigation = useNavigation<Nav>();

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

  const firstName = worker.name.split(' ')[0];
  // Truncate long first names
  const displayName =
    firstName.length > 8 ? firstName.slice(0, 7) + '…' : firstName;

  const primarySlug =
    worker.capableWorkTypes?.[0] || worker.neededWorkType?.[0];
  const workType = workTypes?.find(wt => wt.slug === primarySlug);
  const category = primarySlug
    ? workTypeToCategoryInfo(
        workType,
        getCategoryInfo(primarySlug as WorkCategory),
      )
    : null;

  return (
    <TouchableOpacity
      className="items-center mx-1"
      activeOpacity={0.7}
      accessibilityLabel={`View ${worker.name}'s profile`}
      accessibilityRole="button"
      onPress={() => navigation.navigate('UserProfile', { userId: worker.id })}
    >
      {/* Avatar with online dot */}
      <View className="relative">
        <Avatar photo={worker.photo} size={AVATAR_SIZE} />
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

      {/* Name */}
      <Text
        className="text-[11px] font-semibold text-gray-700 mt-1 text-center w-[74px]"
        numberOfLines={1}
      >
        {displayName}
      </Text>

      {/* Distance */}
      <Text
        className="text-[10px] text-gray-400 mt-px text-center"
        numberOfLines={1}
      >
        {worker.distance}
      </Text>

      {/* Capable work type badge at the bottom */}
      {category ? (
        <View className="mt-1 rounded-full px-1.5 py-0.5 flex-row items-center max-w-[76px]">
          <MaterialIcons name={category.icon} size={9} color="#059669" />
          <Text
            className="text-[8.5px] text-xs text-emerald-700 ml-0.5 tracking-tight"
            numberOfLines={1}
          >
            {category.label}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function LoadingSkeleton() {
  return (
    <View className="pb-3">
      <View className="flex-row items-center px-1 mb-2.5">
        <Skeleton className="h-3 w-28 rounded" />
      </View>
      <View className="flex-row pl-1">
        {[0, 1, 2, 3, 4].map(i => (
          <View key={i} className="items-center ml-3">
            <Skeleton
              className="rounded-full"
              style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
            />
            <Skeleton className="h-2.5 w-10 rounded mt-1.5" />
            <Skeleton className="h-2 w-8 rounded mt-1" />
            <Skeleton className="h-3 w-12 rounded-full mt-1.5" />
          </View>
        ))}
      </View>
    </View>
  );
}

export function NearbyWorkers({
  nearMeFilter,
  showWorksNearYouLink = false,
}: Props): React.JSX.Element | null {
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();
  const { data: workTypes } = useWorkTypes();

  // Use active nearMeFilter; fall back to logged-in user's nearMeLatitude & nearMeLongitude
  const activeNearMe = React.useMemo(() => {
    if (nearMeFilter?.latitude && nearMeFilter?.longitude) {
      return nearMeFilter;
    }
    if (user?.nearMeLatitude != null && user?.nearMeLongitude != null) {
      return {
        latitude: user.nearMeLatitude,
        longitude: user.nearMeLongitude,
        rangeKm: user.nearMeRangeKm || 5,
        conciseLocation: user.nearMeConciseLocation || undefined,
        location: user.nearMeLocation || undefined,
      };
    }
    return undefined;
  }, [
    nearMeFilter,
    user?.nearMeLatitude,
    user?.nearMeLongitude,
    user?.nearMeRangeKm,
    user?.nearMeConciseLocation,
    user?.nearMeLocation,
  ]);

  const { data: workers, isLoading } = useNearbyWorkers(activeNearMe);

  // Nothing to show when no location filter is active or available
  if (!activeNearMe) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <View className="pb-3">
      {/* Section header */}
      <View className="flex-row items-center px-1 mb-2.5">
        <TouchableOpacity
          className="flex-row items-center"
          activeOpacity={0.7}
          accessibilityLabel="View all workers near you"
          accessibilityRole="button"
          onPress={() =>
            navigation.navigate('NearbyWorkersList', {
              latitude: activeNearMe.latitude,
              longitude: activeNearMe.longitude,
              rangeKm: activeNearMe.rangeKm,
              conciseLocation: activeNearMe.conciseLocation,
              location: activeNearMe.location,
            })
          }
        >
          <Text className="text-[13px] font-semibold text-gray-500 tracking-[0.2px]">
            Workers near you
          </Text>
        </TouchableOpacity>
        {/* <TouchableOpacity
          className="flex-row items-center ml-auto bg-emerald-50 rounded-full border border-emerald-200 px-2.5 py-1"
          activeOpacity={0.7}
          accessibilityLabel="Near Me"
          accessibilityRole="button"
          onPress={onNearMePress}
        >
          <MaterialIcons name="near-me" size={14} color="#047857" />
          <Text
            className="text-[11px] font-semibold text-emerald-700 ml-1 max-w-[200px]"
            numberOfLines={1}
          >
            {activeNearMe.conciseLocation || 'Near Me'}
            {' • '}
            {activeNearMe.rangeKm} km
          </Text>
        </TouchableOpacity> */}
      </View>

      {!workers || workers.length === 0 ? (
        <View className="py-2.5 px-3 mx-1 bg-white rounded-xl border border-gray-100 flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-emerald-50 items-center justify-center mr-2.5">
            <MaterialIcons name="person-search" size={16} color="#059669" />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-semibold text-gray-700">
              No workers nearby
            </Text>
            <Text className="text-[11px] text-gray-400 mt-0.5">
              Try increasing your Near Me range
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={workers}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: 2,
          }}
          renderItem={({ item }) => (
            <WorkerItem worker={item} workTypes={workTypes} />
          )}
        />
      )}
      {showWorksNearYouLink && (
        <TouchableOpacity
          className="mt-6 ml-1 flex-row items-center self-start"
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="View all works near you"
          onPress={() =>
            (navigation as any).navigate('NearbyWorksList', {
              latitude: activeNearMe.latitude,
              longitude: activeNearMe.longitude,
              rangeKm: activeNearMe.rangeKm,
              conciseLocation: activeNearMe.conciseLocation,
              location: activeNearMe.location,
            })
          }
        >
          <Text className="text-[13px] mb-1 mt-2 font-semibold text-gray-500 tracking-[0.2px]">
            Works near you
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
