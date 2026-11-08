/**
 * useSearchScreen
 * Data fetching and interaction logic for SearchScreen.
 * Keeps all React Query usage out of the component.
 */

import React from 'react';
import { Keyboard } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useStore } from '../../store';
import { useAuthStore } from '../../store/useAuthStore';
import { useSearchUsers } from '../../hooks/useUsers';
import { useWorks } from '../../hooks/useWorks';
import { useRecentSearches, useLogSearch } from '../../hooks/useSearchLogs';
import type { HomeStackParamList } from '../../types';
import type { UserSummary } from '../../services/userService';
import { haversineKm } from '../../utils/distanceUtils';

type SearchNavigation = NativeStackNavigationProp<HomeStackParamList, 'Search'>;

export function useSearchScreen(navigation: SearchNavigation) {
  const { searchQuery, setSearchQuery } = useStore();
  const { data: users } = useSearchUsers(searchQuery);
  const { data: allWorks } = useWorks();

  // Auth — for logging searches to the backend
  const { user } = useAuthStore();
  const userId = user?.id;

  // Recent searches from the backend
  const { data: recentSearches } = useRecentSearches(userId);
  const logSearch = useLogSearch();

  const query = searchQuery.trim();
  const hasActiveFilter = query.length > 0;

  const filteredWorks = React.useMemo(() => {
    if (!allWorks || !query) return [];
    const q = query.toLowerCase();
    return allWorks
      .filter(
        w =>
          w.title?.toLowerCase().includes(q) ||
          w.description.toLowerCase().includes(q) ||
          w.category.toLowerCase().includes(q) ||
          w.tags?.some(tag => tag.toLowerCase().includes(q)),
      )
      .map(w => {
        let distanceStr: string | undefined;
        if (
          user?.nearMeLatitude != null &&
          user?.nearMeLongitude != null &&
          w.latitude != null &&
          w.longitude != null
        ) {
          const distVal = haversineKm(
            user.nearMeLatitude,
            user.nearMeLongitude,
            w.latitude,
            w.longitude,
          );
          distanceStr = `${distVal.toFixed(1)} km`;
        }
        return {
          ...w,
          distance: distanceStr || w.distance,
        };
      });
  }, [allWorks, query, user?.nearMeLatitude, user?.nearMeLongitude]);

  const usersWithDistance = React.useMemo(() => {
    if (!users) return [];
    return users.map(u => {
      let distanceStr: string | undefined;
      if (
        user?.nearMeLatitude != null &&
        user?.nearMeLongitude != null &&
        u.latitude != null &&
        u.longitude != null
      ) {
        const distVal = haversineKm(
          user.nearMeLatitude,
          user.nearMeLongitude,
          u.latitude,
          u.longitude,
        );
        distanceStr = `${distVal.toFixed(1)} km`;
      }
      return {
        ...u,
        distance: distanceStr,
      };
    });
  }, [users, user?.nearMeLatitude, user?.nearMeLongitude]);

  const persistSearch = (term: string) => {
    const trimmed = term.trim();
    if (trimmed && userId) {
      logSearch.mutate({ userId, query: trimmed });
    }
  };

  const handleSubmitSearch = () => {
    persistSearch(searchQuery);
    Keyboard.dismiss();
  };

  const handleUserPress = (item: UserSummary) => {
    persistSearch(query);
    Keyboard.dismiss();
    navigation.navigate('UserProfile', { userId: item.id });
  };

  const handleWorkPress = (workId: string) => {
    persistSearch(query);
    Keyboard.dismiss();
    navigation.navigate('WorkDetail', { workId, origin: 'Search' });
  };

  const handleRecentPress = (term: string) => {
    setSearchQuery(term);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
  };

  return {
    searchQuery,
    users: usersWithDistance,
    works: filteredWorks,
    recentSearches: recentSearches ?? [],
    query,
    hasActiveFilter,
    onSearchChange: setSearchQuery,
    onSubmitSearch: handleSubmitSearch,
    onUserPress: handleUserPress,
    onWorkPress: handleWorkPress,
    onRecentPress: handleRecentPress,
    onEditRecentPress: () => navigation.navigate('RecentSearches'),
    onClearFilters: handleClearFilters,
  };
}
