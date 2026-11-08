import React, { useCallback } from 'react';
import { View, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useWorks } from '../../hooks/useWorks';
import { WorkCard } from '../../components/WorkCard';
import { EmptyState } from '../../components/EmptyState';
import { Skeleton } from '../../components/Skeleton';
import { HomeStackParamList, Work } from '../../types';
import Animated from 'react-native-reanimated';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

interface NearMeFilter {
  latitude: number;
  longitude: number;
  rangeKm: number;
  conciseLocation?: string;
  location?: string;
}

interface Props {
  scrollHandler: any;
  onNearMePress: () => void;
  nearMeFilter?: NearMeFilter;
  onClearNearMe?: () => void;
  headerContentHeight: number;
}

export function HomeWorkGrid({
  scrollHandler,
  nearMeFilter,
  headerContentHeight,
}: Props) {
  const navigation = useNavigation<Nav>();
  const { data: works, isLoading, refetch } = useWorks(nearMeFilter);

  const [refreshing, setRefreshing] = React.useState(false);

  // Near-me distance filtering is done server-side via the works API; the
  // `useWorks(nearMeFilter)` hook refetches automatically whenever the
  // near-me location or range changes.
  const filteredWorks = React.useMemo(() => {
    if (!works) return [];
    return works as Work[];
  }, [works]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const HEADER_HEIGHT = headerContentHeight;

  const renderItem = useCallback(
    ({ item }: { item: Work }) => {
      return (
        <WorkCard
          work={item}
          onPress={() => navigation.navigate('WorkDetail', { workId: item.id })}
        />
      );
    },
    [navigation],
  );

  if (isLoading) {
    return (
      <View className="flex-1 px-4" style={{ paddingTop: HEADER_HEIGHT + 12 }}>
        {[0, 1, 2].map(row => (
          <View
            key={row}
            className="bg-white rounded-2xl mb-3 overflow-hidden shadow-sm border border-gray-100"
          >
            <Skeleton
              className="w-full"
              // eslint-disable-next-line react-native/no-inline-styles
              style={{ aspectRatio: 2 }}
            />
            <View className="p-4">
              <Skeleton className="h-4 w-4/5 rounded mb-2" />
              <Skeleton className="h-4 w-2/5 rounded mb-2" />
              <Skeleton className="h-3 w-1/3 rounded" />
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View className="flex-1 mt-0">
      <Animated.FlatList
        data={filteredWorks}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <EmptyState
            icon="📋"
            title="No works found"
            message="Try selecting a different category or check back later"
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#059669"
          />
        }
        contentContainerStyle={{
          paddingBottom: 32,
          flexGrow: 1,
          paddingTop: HEADER_HEIGHT + 12,
        }}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        ListFooterComponent={<View className="h-24" />}
      />
    </View>
  );
}
