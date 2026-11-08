import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { SearchUserRow } from './SearchUserRow';
import { SearchWorkRow } from './SearchScreen';
import { useSearchUsers } from '../../hooks/useUsers';
import { useWorks } from '../../hooks/useWorks';
import { useAuthStore } from '../../store/useAuthStore';
import { HomeStackParamList } from '../../types';
import { haversineKm } from '../../utils/distanceUtils';

type NavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  'SearchResultsList'
>;
type RoutePropType = RouteProp<HomeStackParamList, 'SearchResultsList'>;

export function SearchResultsListScreen(): React.JSX.Element {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  const insets = useSafeAreaInsets();
  const { type, query } = route.params;

  const { user } = useAuthStore();

  // Fetch people
  const { data: users, isLoading: usersLoading } = useSearchUsers(
    type === 'people' ? query : '',
  );

  // Fetch works
  const { data: allWorks, isLoading: worksLoading } = useWorks();

  const works = React.useMemo(() => {
    if (type !== 'works' || !allWorks || !query) return [];
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
  }, [type, allWorks, query, user?.nearMeLatitude, user?.nearMeLongitude]);

  const usersWithDistance = React.useMemo(() => {
    if (type !== 'people' || !users) return [];
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
  }, [type, users, user?.nearMeLatitude, user?.nearMeLongitude]);

  const handleUserPress = (item: any) => {
    navigation.navigate('UserProfile', { userId: item.id });
  };

  const handleWorkPress = (workId: string) => {
    navigation.navigate('WorkDetail', { workId, origin: 'Search' });
  };

  const isLoading = type === 'people' ? usersLoading : worksLoading;
  const listData = type === 'people' ? usersWithDistance : works;

  return (
    <View className="flex-1 bg-gray-50">
      <View style={{ height: insets.top }} className="bg-white" />

      {/* Header */}
      <View className="bg-white px-4 pb-3 flex-row items-center border-b border-gray-100">
        <TouchableOpacity
          className="w-9 h-9 items-center justify-center mr-2"
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back-ios" size={18} color="#374151" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>
            {type === 'people' ? 'People Matches' : 'Works Matches'}
          </Text>
          <Text
            className="text-xs text-gray-500 font-medium mt-0.5"
            numberOfLines={1}
          >
            Results matching "{query}"
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm font-medium text-gray-500">
            Loading results...
          </Text>
        </View>
      ) : listData.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-3">
            <MaterialIcons name="search-off" size={28} color="#9CA3AF" />
          </View>
          <Text className="text-base font-semibold text-gray-800 text-center">
            No matches found
          </Text>
          <Text className="text-sm text-gray-500 text-center mt-1">
            We couldn't find any {type} matching "{query}"
          </Text>
        </View>
      ) : type === 'people' ? (
        <FlatList
          data={usersWithDistance}
          keyExtractor={item => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 32,
          }}
          renderItem={({ item }) => (
            <SearchUserRow user={item} onPress={handleUserPress} />
          )}
        />
      ) : (
        <FlatList
          data={works}
          keyExtractor={item => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 32,
          }}
          renderItem={({ item }) => (
            <SearchWorkRow work={item} onPress={handleWorkPress} />
          )}
        />
      )}
    </View>
  );
}
