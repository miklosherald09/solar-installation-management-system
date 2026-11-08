/**
 * MessagesScreen
 * Composes atomic messages components — thin, owns hooks & navigation only.
 */

import React from 'react';
import {
  View,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import {
  useConversations,
  useMarkConversationRead,
  useArchiveConversation,
} from '../../hooks/useConversations';
import { MessagesStackParamList, ConversationPreview, Work } from '../../types';
import { useWorks } from '../../hooks/useWorks';
import { MessagesHeader } from './MessagesHeader';
import { ConversationItem } from './ConversationItem';
import { ConversationListSkeleton } from './ConversationListSkeleton';
import { LoginPrompt } from './LoginPrompt';
import { EmptyState } from './EmptyState';
import { NearbyWorkers } from '../../components/NearbyWorkers';

type MessagesNav = NativeStackNavigationProp<
  MessagesStackParamList,
  'Messages'
>;

export function MessagesScreen(): React.JSX.Element {
  const navigation = useNavigation<MessagesNav>();
  const { user, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = React.useState(false);
  const insets = useSafeAreaInsets();

  // Re-fetch conversations whenever the screen is focused
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['conversations', 'list'] });
      }
    });
    return unsubscribe;
  }, [navigation, user?.id, queryClient]);

  const [searchQuery, setSearchQuery] = React.useState('');
  const { data: conversations, isLoading, isError } = useConversations();
  const { data: works } = useWorks();
  const markAsRead = useMarkConversationRead();
  const { mutate: archiveConversation } = useArchiveConversation();

  // Create a map of workId to Work objects for fast local lookup during search
  const worksMap = React.useMemo(() => {
    const map = new Map<string, Work>();
    if (works) {
      works.forEach(w => {
        map.set(w.id, w);
      });
    }
    return map;
  }, [works]);

  const filteredConversations = React.useMemo(() => {
    const list = conversations ?? [];
    const query = searchQuery.trim().toLowerCase();

    let filtered = list.filter(c => !c.isArchived);

    if (query) {
      filtered = filtered.filter(c => {
        const titleMatch = (c.title ?? '').toLowerCase().includes(query);
        const partnerNameMatch = (c.partner?.name ?? '')
          .toLowerCase()
          .includes(query);
        const lastMessageMatch = (c.lastMessage ?? '')
          .toLowerCase()
          .includes(query);

        let workMatch = false;
        if (c.workId) {
          const work = worksMap.get(c.workId);
          if (work) {
            workMatch =
              (work.title ?? '').toLowerCase().includes(query) ||
              (work.description ?? '').toLowerCase().includes(query);
          }
        }

        return titleMatch || partnerNameMatch || lastMessageMatch || workMatch;
      });
    }

    return filtered.sort((a, b) => Number(b.isPinned) - Number(a.isPinned));
  }, [conversations, searchQuery, worksMap]);

  const handleConversationPress = (conversation: ConversationPreview) => {
    // Optimistically mark conversation as read immediately before navigating
    if (conversation.unreadCount > 0 && user?.id) {
      markAsRead.mutate({
        conversationId: conversation.id,
        userId: user.id,
      });
    }

    navigation.navigate('ConversationDetail', {
      conversationId: conversation.id,
      partnerName: conversation.title ?? 'Unknown',
      partnerId: conversation.partner.id,
      partnerPhoto: conversation.photo,
      partnerPhone: conversation.partner.phone ?? undefined,
      workId: conversation.workId ?? undefined,
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({
      queryKey: ['conversations', 'list'],
    });
    setRefreshing(false);
  };

  // ---------------------------------------------------------------------------
  // Not authenticated – show login prompt
  // ---------------------------------------------------------------------------
  if (!isAuthenticated || !user?.id) {
    return <LoginPrompt topInset={insets.top} />;
  }

  // ---------------------------------------------------------------------------
  // Authenticated – show conversations
  // ---------------------------------------------------------------------------
  return (
    <View className="flex-1 bg-white">
      <MessagesHeader
        topInset={insets.top}
        onBack={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            (navigation as any).navigate('HomeTab', { screen: 'Home' });
          }
        }}
      />

      {/* Search Bar */}
      <View className="px-4 py-2 border-b border-gray-100 bg-white">
        <View className="flex-row items-center bg-gray-100 rounded-full px-3">
          <MaterialIcons name="search" size={20} color="#9CA3AF" />
          <TextInput
            className="flex-1 ml-2 text-sm h-12 text-gray-900"
            style={
              Platform.OS === 'android' ? { padding: 0 } : { lineHeight: 0 }
            }
            placeholder="Search by name, message, or work..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <ConversationListSkeleton />
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-base text-gray-500 text-center">
            Could not load conversations. Pull to refresh.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ConversationItem
              conversation={item}
              onPress={() => handleConversationPress(item)}
              onArchive={() => archiveConversation(item.id)}
            />
          )}
          ListHeaderComponent={
            !searchQuery.trim() ? (
              <View className="pt-2.5 pb-1 mb-1 border-b border-gray-100 px-3">
                <NearbyWorkers />
              </View>
            ) : null
          }
          contentContainerStyle={{
            paddingBottom: insets.bottom + 120,
          }}
          ListEmptyComponent={
            searchQuery.trim() ? (
              <View className="flex-1 items-center justify-center py-20 px-5">
                <MaterialIcons name="search-off" size={48} color="#D1D5DB" />
                <Text className="text-base text-gray-400 mt-4 font-semibold text-center">
                  No results found
                </Text>
                <Text className="text-sm text-gray-300 mt-1 text-center">
                  Try searching for a different name, message, or work
                  description
                </Text>
              </View>
            ) : (
              <EmptyState />
            )
          }
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
    </View>
  );
}
