/**
 * NearbyWorksListScreen
 * Full-screen list of all works near the user's configured near-me location.
 * Uses the same marketplace card grid layout as HomeScreen.
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useWorks } from '../../hooks/useWorks';
import { WorkCardSm } from '../../components/WorkCardSm';
import { EmptyState } from '../../components/EmptyState';
import { Skeleton } from '../../components/Skeleton';
import { padForColumns } from '../home/helpers';
import { HomeStackParamList, Work } from '../../types';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'NearbyWorksList'>;
type Route = RouteProp<HomeStackParamList, 'NearbyWorksList'>;

function WorksGridSkeleton({ numColumns }: { numColumns: number }) {
  return (
    <View className="flex-1 px-4 pt-3">
      {[0, 1, 2].map(row => (
        <View key={row} className="flex-row gap-3 mb-3">
          {Array.from({ length: numColumns }).map((_, col) => (
            <View key={col} className="flex-1">
              <View className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                <Skeleton className="w-full" style={{ aspectRatio: 1.5 }} />
                <View className="p-3">
                  <Skeleton className="h-3.5 w-4/5 rounded mb-2" />
                  <Skeleton className="h-3 w-2/5 rounded mb-2" />
                  <Skeleton className="h-2.5 w-1/3 rounded" />
                </View>
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export function NearbyWorksListScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const numColumns = width >= 768 ? 4 : 2;

  const { latitude, longitude, rangeKm, conciseLocation, location } =
    route.params;
  const nearMe = useMemo(
    () => ({ latitude, longitude, rangeKm }),
    [latitude, longitude, rangeKm],
  );

  const {
    data: works,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useWorks(nearMe);

  // Completed works are hidden from the marketplace feed
  const activeWorks = useMemo(() => {
    if (!works) return [];
    return (works as Work[]).filter(w => w.status !== 'completed');
  }, [works]);

  const paddedWorks = useMemo(
    () => padForColumns(activeWorks, numColumns),
    [activeWorks, numColumns],
  );

  const locationLabel = conciseLocation || location || 'your area';

  const renderItem = useCallback(
    ({ item }: { item: Work & { _isPlaceholder?: boolean } }) => {
      if (item.id === '__placeholder__') {
        return <View style={{ flex: 1 }} />;
      }
      return (
        <View style={{ flex: 1 }}>
          <WorkCardSm
            work={item}
            onPress={() =>
              navigation.navigate('WorkDetail', { workId: item.id })
            }
            compact
            compactAspectRatio={1.5}
          />
        </View>
      );
    },
    [navigation],
  );

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
              Works near you
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
        <WorksGridSkeleton numColumns={numColumns} />
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <MaterialIcons name="error-outline" size={48} color="#9CA3AF" />
          <Text className="text-base text-gray-500 text-center mt-3">
            Could not load nearby works.
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            className="mt-4 px-4 py-2 bg-emerald-700 rounded-full active:opacity-90"
          >
            <Text className="text-white font-semibold text-sm">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={paddedWorks}
          keyExtractor={item => item.id}
          numColumns={numColumns}
          columnWrapperStyle={{ gap: 12 }}
          renderItem={renderItem}
          ListEmptyComponent={
            <EmptyState
              icon="📋"
              title="No works found"
              message="Try increasing your Near Me range or check back later"
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#059669"
            />
          }
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 32,
            flexGrow: 1,
          }}
        />
      )}
    </View>
  );
}
