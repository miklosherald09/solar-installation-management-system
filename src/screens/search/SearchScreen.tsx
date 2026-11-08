/**
 * SearchScreen
 * Search users by name — real-time suggestions, recent searches.
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { SearchBar } from './SearchBar';
import { SearchUserRow } from './SearchUserRow';
import { RecentSearches } from './RecentSearches';
import { SearchEmptyState } from './SearchEmptyState';
import { useSearchScreen } from './useSearchScreen';
import { HomeStackParamList, Work } from '../../types';
import type { UserSummary } from '../../services/userService';
import { useAuthStore } from '../../store/useAuthStore';
import { useWorkCurrency, useWorkTypes } from '../../hooks';
import {
  EditProfileLocationSheet,
  EditProfileLocationSheetHandle,
} from '../profileSettings/EditProfileLocationSheet';
import { getCategoryInfo, workTypeToCategoryInfo } from '../../constants';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Search'>;

type SearchListItem =
  | { type: 'section_header'; title: string; count: number; isFirst?: boolean }
  | { type: 'user'; data: UserSummary }
  | { type: 'work'; data: Work }
  | { type: 'empty_section'; title: string }
  | { type: 'see_more'; section: 'people' | 'works' };

export function SearchWorkRow({
  work,
  onPress,
}: {
  work: Work;
  onPress: (id: string) => void;
}): React.JSX.Element {
  const { data: workTypes } = useWorkTypes();
  const currencySymbol = useWorkCurrency(work);
  const workType = workTypes?.find(j => j.slug === work.category);
  const category = workTypeToCategoryInfo(
    workType,
    getCategoryInfo(work.category),
  );

  return (
    <TouchableOpacity
      className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm"
      activeOpacity={0.7}
      onPress={() => onPress(work.id)}
    >
      <View className="flex-row items-center justify-between mb-2">
        <MaterialIcons name={category.icon} size={18} color={category.color} />

        <Text
          className="text-base font-bold text-gray-900 flex-1 ml-2 mr-2"
          numberOfLines={1}
        >
          {work.title || work.category}
        </Text>
        <Text className="text-sm font-bold text-emerald-700">
          {currencySymbol}
          {work.budget}
          <Text className="text-xs font-normal text-gray-500">
            {work.budgetType === 'hourly' ? '/hr' : ''}
          </Text>
        </Text>
      </View>
      <Text className="text-sm text-gray-600 mb-3" numberOfLines={2}>
        {work.description}
      </Text>
      <View className="flex-row items-center">
        <MaterialIcons name="place" size={16} color="#9CA3AF" />
        <Text className="text-xs text-gray-500 ml-1 flex-1" numberOfLines={1}>
          {work.distance ? `${work.distance} · ` : ''}
          {work.conciseLocation}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function SearchScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const locationSheetRef = React.useRef<EditProfileLocationSheetHandle>(null);
  const {
    searchQuery,
    users,
    works,
    recentSearches,
    hasActiveFilter,
    onSearchChange,
    onSubmitSearch,
    onUserPress,
    onWorkPress,
    onRecentPress,
    onEditRecentPress,
  } = useSearchScreen(navigation);

  const inputRef = React.useRef<TextInput>(null);
  const [hasAppliedRecent, setHasAppliedRecent] = React.useState(false);
  const [selection, setSelection] = React.useState<
    { start: number; end: number } | undefined
  >(undefined);

  React.useEffect(() => {
    if (!hasAppliedRecent && recentSearches) {
      if (recentSearches.length > 0) {
        const lastQuery = recentSearches[0].query;
        onSearchChange(lastQuery);
        setSelection({ start: 0, end: lastQuery.length });

        const timer = setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
        setHasAppliedRecent(true);
        return () => clearTimeout(timer);
      } else {
        setHasAppliedRecent(true);
      }
    }
  }, [recentSearches, hasAppliedRecent, onSearchChange]);

  const handleAddressPress = () => {
    if (user?.nearMeLatitude != null && user?.nearMeLongitude != null) {
      navigation.navigate('WorkLocationMap', {
        latitude: user.nearMeLatitude,
        longitude: user.nearMeLongitude,
        address: user.nearMeLocation || undefined,
        showAllNearby: true,
      });
    } else {
      locationSheetRef.current?.open();
    }
  };

  const listData = React.useMemo<SearchListItem[]>(() => {
    if (!hasActiveFilter) return [];

    const result: SearchListItem[] = [];

    // Add People
    result.push({
      type: 'section_header',
      title: 'People',
      count: users.length,
      isFirst: true,
    });
    if (users.length === 0) {
      result.push({ type: 'empty_section', title: 'No people found' });
    } else {
      const showUsers = users.slice(0, 5);
      showUsers.forEach(u => result.push({ type: 'user', data: u }));
      if (users.length > 5) {
        result.push({ type: 'see_more', section: 'people' });
      }
    }

    // Add Works
    result.push({
      type: 'section_header',
      title: 'Works',
      count: works.length,
    });
    if (works.length === 0) {
      result.push({ type: 'empty_section', title: 'No works found' });
    } else {
      const showWorks = works.slice(0, 5);
      showWorks.forEach(w => result.push({ type: 'work', data: w }));
      if (works.length > 5) {
        result.push({ type: 'see_more', section: 'works' });
      }
    }

    return result;
  }, [hasActiveFilter, users, works]);

  // Overall empty state helper
  const isSearchEmpty =
    hasActiveFilter && users.length === 0 && works.length === 0;

  const renderItem = ({ item }: { item: SearchListItem }) => {
    switch (item.type) {
      case 'section_header':
        return (
          <View
            className={`flex-row items-center justify-between mb-2 ${
              item.isFirst ? 'mt-1' : 'mt-5'
            }`}
          >
            <Text className="text-sm font-bold text-gray-800 uppercase tracking-wider">
              {item.title}
            </Text>
            <Text className="text-xs text-gray-400">
              {item.count} result{item.count !== 1 ? 's' : ''}
            </Text>
          </View>
        );
      case 'user':
        return <SearchUserRow user={item.data} onPress={onUserPress} />;
      case 'work':
        return <SearchWorkRow work={item.data} onPress={onWorkPress} />;
      case 'empty_section':
        return (
          <View className="py-5 bg-white rounded-2xl border border-dashed border-gray-200 items-center justify-center my-1 px-4">
            <Text className="text-sm text-gray-400 font-medium text-center">
              {item.title}
            </Text>
          </View>
        );
      case 'see_more':
        return (
          <TouchableOpacity
            className="flex-row  py-3 mt-1 mb-3  "
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate('SearchResultsList', {
                type: item.section,
                query: searchQuery,
              })
            }
          >
            <Text className="text-sm font-semibold text-emerald-700 mr-1.5">
              See all matching {item.section}
            </Text>
            <MaterialIcons name="arrow-forward" size={16} color="#047857" />
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View style={{ height: insets.top }} className="bg-white" />

      {/* Header */}
      <View className="bg-white px-4 pb-3">
        <View className="flex-row items-center">
          <TouchableOpacity
            className="w-9 h-9 items-center justify-center mr-1"
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back-ios" size={18} color="#374151" />
          </TouchableOpacity>
          <View className="flex-1">
            <SearchBar
              ref={inputRef}
              value={searchQuery}
              onChangeText={onSearchChange}
              placeholder="Search people or works"
              autoFocus
              onSubmit={onSubmitSearch}
              selection={selection}
              onSelectionChange={(e: any) =>
                setSelection(e.nativeEvent.selection)
              }
            />
          </View>
        </View>

        {/* Saved Location Row */}
        <View className="flex-row items-center mt-2.5 rounded-xl px-0 py-2">
          <TouchableOpacity
            activeOpacity={0.7}
            className="flex-row items-center flex-1 mr-2"
            onPress={handleAddressPress}
          >
            <MaterialIcons name="place" size={16} color="#059669" />
            <Text
              className="text-sm text-gray-500  font-medium ml-1.5 flex-1"
              numberOfLines={1}
            >
              Searching near:{' '}
              <Text className="text-emerald-700 font-semibold">
                {user?.nearMeLocation || 'Set location'}
              </Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => locationSheetRef.current?.open()}
            className="p-1 -mr-1"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="edit" size={14} color="#059669" />
          </TouchableOpacity>
        </View>
      </View>

      {isSearchEmpty ? (
        <SearchEmptyState hasQuery={hasActiveFilter} />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, index) => `${item.type}-${index}`}
          keyboardShouldPersistTaps="handled"
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 32,
          }}
          ListHeaderComponent={
            <>
              {!hasActiveFilter && recentSearches.length > 0 && (
                <RecentSearches
                  items={recentSearches}
                  onItemPress={onRecentPress}
                  onEditPress={onEditRecentPress}
                />
              )}
            </>
          }
          ListFooterComponent={<View className="h-16"></View>}
          ListEmptyComponent={
            !hasActiveFilter ? <SearchEmptyState hasQuery={false} /> : null
          }
        />
      )}

      <EditProfileLocationSheet ref={locationSheetRef} />
    </View>
  );
}
