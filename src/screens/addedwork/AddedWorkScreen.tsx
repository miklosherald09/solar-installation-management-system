/**
 * AddedWorkScreen
 * Lists all works posted by the current user in a 2-column marketplace grid
 * (same layout as the home work list). A "Create New Work" button is pinned
 * to the bottom and opens the add-work form.
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/useAuthStore';
import { useUserWorks } from '../../hooks/useWorks';
import { WorkCardSm } from '../../components/WorkCardSm';
import { EmptyState } from '../../components/EmptyState';
import { ProfileStackParamList } from '../../types';
import { useHideTabBar } from '../../navigation/useHideTabBar';
import { AddedWorkHeader } from './AddedWorkHeader';

type AddedWorkScreenNavigationProp = NativeStackNavigationProp<
  ProfileStackParamList,
  'AddedWork'
>;

export function AddedWorkScreen(): React.JSX.Element {
  useHideTabBar();
  const navigation = useNavigation<AddedWorkScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'android' ? insets.bottom : 0;

  const { user } = useAuthStore();
  const { data: myWorks, isLoading, refetch } = useUserWorks(user?.id);
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const works = myWorks ?? [];
  const isEmpty = !isLoading && works.length === 0;

  return (
    <View className="flex-1 bg-white pb-0">
      <AddedWorkHeader onBackPress={() => navigation.goBack()} />

      <FlatList
        className="flex-1"
        data={
          isEmpty
            ? []
            : works.length % 2 !== 0
            ? [...works, { id: '__placeholder__' } as any]
            : works
        }
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        renderItem={({ item }) => {
          if (item.id === '__placeholder__') {
            return <View style={{ flex: 1 }} />;
          }
          return (
            <View style={{ flex: 1 }}>
              <WorkCardSm
                work={item}
                compact
                onPress={() =>
                  navigation.navigate('WorkDetail', { workId: item.id })
                }
                compactAspectRatio={2}
              />
            </View>
          );
        }}
        ListEmptyComponent={
          isLoading ? (
            <View className="flex-1 items-center justify-center py-10">
              <ActivityIndicator size="small" color="#059669" />
            </View>
          ) : (
            <EmptyState
              icon="📋"
              title="No works yet"
              message="You haven't posted any works yet. Tap the button below to add your first one."
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#059669"
          />
        }
        contentContainerStyle={[
          { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 100 },
          isEmpty && { flexGrow: 1 },
        ]}
      />

      {/* Bottom: Create New Work */}
      <View style={{ paddingBottom: bottomPad }}>
        <View className="bg-white px-5 py-4 border-t border-gray-100">
          <TouchableOpacity
            className="rounded-xl py-4 items-center bg-emerald-600"
            activeOpacity={0.8}
            onPress={() => navigation.navigate('PostWork', {})}
          >
            <Text className="text-base font-bold text-white">
              Post Project / Work
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
