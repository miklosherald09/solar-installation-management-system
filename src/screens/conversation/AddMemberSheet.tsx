import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetFlatList,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBottomSheetBackdrop } from '../../components';
import { useSearchUsers } from '../../hooks/useUsers';
import { useCreateGroupConversation } from '../../hooks/useConversations';
import { fetchConversationDetail } from '../../services/messagingService';
import type { UserSummary } from '../../services/userService';
import { getInitials } from './helpers';

export interface AddMemberSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  conversationId: string;
  currentUserId: string;
  currentPartnerId?: string;
  currentPartnerName?: string;
  workId?: string;
  onGroupCreated: (newConversationId: string, groupTitle: string) => void;
}

export function AddMemberSheet({
  sheetRef,
  conversationId,
  currentUserId,
  currentPartnerId,
  currentPartnerName,
  workId,
  onGroupCreated,
}: AddMemberSheetProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(() => ['75%', '92%'], []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<UserSummary[]>([]);
  const [customGroupName, setCustomGroupName] = useState('');
  const [existingParticipantIds, setExistingParticipantIds] = useState<
    Set<string>
  >(new Set());

  const { data: users, isLoading: isSearching } = useSearchUsers(searchQuery, {
    enableEmpty: true,
  });
  const createGroupMutation = useCreateGroupConversation();

  // Load existing participants from conversation so they can't be added again
  useEffect(() => {
    let isMounted = true;
    const initialSet = new Set<string>();
    if (currentUserId) initialSet.add(currentUserId);
    if (currentPartnerId) initialSet.add(currentPartnerId);
    setExistingParticipantIds(new Set(initialSet));

    if (conversationId) {
      fetchConversationDetail(conversationId)
        .then(detail => {
          if (!isMounted) return;
          const merged = new Set(initialSet);
          if (Array.isArray(detail?.participants)) {
            detail.participants.forEach(id => merged.add(id));
          }
          setExistingParticipantIds(merged);
        })
        .catch(() => {
          // Non-critical: initialSet already has current user & partner
        });
    }

    return () => {
      isMounted = false;
    };
  }, [conversationId, currentUserId, currentPartnerId]);

  const renderBackdrop = useCallback(
    (props: any) => <AppBottomSheetBackdrop {...props} />,
    [],
  );

  const toggleSelectUser = useCallback((user: UserSummary) => {
    setSelectedUsers(prev => {
      const exists = prev.some(u => u.id === user.id);
      if (exists) {
        return prev.filter(u => u.id !== user.id);
      }
      return [...prev, user];
    });
  }, []);

  const removeSelectedUser = useCallback((userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  }, []);

  const handleDismiss = useCallback(() => {
    sheetRef.current?.dismiss();
  }, [sheetRef]);

  const handleCreateGroup = async () => {
    if (selectedUsers.length === 0 || createGroupMutation.isPending) return;

    // Collect all participant IDs: current user + existing participants + new members
    const participantIds = Array.from(
      new Set([
        ...Array.from(existingParticipantIds),
        ...selectedUsers.map(u => u.id),
      ]),
    );

    // Build default title from partner name + selected member names
    const names = [
      currentPartnerName,
      ...selectedUsers.map(u => u.name),
    ].filter(Boolean);
    const defaultTitle = names.join(', ').slice(0, 100);
    const title = customGroupName.trim() || defaultTitle || 'Group Chat';

    try {
      const result = await createGroupMutation.mutateAsync({
        userId: currentUserId,
        participantIds,
        title,
        workId: workId || undefined,
        firstMessage: `Started a group chat with ${names.join(', ')}`,
      });

      // Clear state and dismiss sheet
      setSelectedUsers([]);
      setSearchQuery('');
      setCustomGroupName('');
      sheetRef.current?.dismiss();

      // Notify parent to navigate to the new conversation
      setTimeout(() => {
        onGroupCreated(result.conversationId, result.title || title);
      }, 300);
    } catch (err: any) {
      Alert.alert(
        'Could not create group',
        err?.message ||
          'An error occurred while creating the group conversation.',
      );
    }
  };

  // Filter out current user from candidate list
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(u => u.id !== currentUserId);
  }, [users, currentUserId]);

  const renderUserItem = ({ item }: { item: UserSummary }) => {
    const isAlreadyInChat = existingParticipantIds.has(item.id);
    const isSelected = selectedUsers.some(u => u.id === item.id);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        disabled={isAlreadyInChat}
        onPress={() => toggleSelectUser(item)}
        className={`flex-row items-center px-5 py-3 border-b border-gray-100 ${
          isAlreadyInChat ? 'opacity-50 bg-gray-50/50' : 'active:bg-gray-50'
        }`}
      >
        {/* Avatar */}
        {item.photo ? (
          <Image
            source={{ uri: item.photo }}
            style={{ width: 44, height: 44, borderRadius: 22 }}
            className="mr-3 bg-gray-200"
          />
        ) : (
          <View className="w-11 h-11 rounded-full bg-emerald-100 items-center justify-center mr-3">
            <Text className="text-sm font-bold text-emerald-700">
              {getInitials(item.name)}
            </Text>
          </View>
        )}

        {/* Info */}
        <View className="flex-1 mr-3">
          <View className="flex-row items-center">
            <Text
              className="text-base font-semibold text-gray-900"
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {item.verifiedAt ? (
              <MaterialIcons
                name="verified"
                size={16}
                color="#059669"
                style={{ marginLeft: 4 }}
              />
            ) : null}
          </View>
          <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
            {item.email || item.conciseLocation || 'Member'}
          </Text>
        </View>

        {/* Checkbox / In-chat indicator */}
        {isAlreadyInChat ? (
          <View className="bg-gray-100 px-2.5 py-1 rounded-full">
            <Text className="text-xs font-medium text-gray-500">In Chat</Text>
          </View>
        ) : isSelected ? (
          <MaterialIcons name="check-circle" size={24} color="#059669" />
        ) : (
          <View className="w-6 h-6 rounded-full border-2 border-gray-300" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      handleIndicatorStyle={{ backgroundColor: '#D1D5DB', width: 40 }}
    >
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="px-5 pt-2 pb-3 border-b border-gray-100 flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-bold text-gray-900">Add Members</Text>
            <Text className="text-xs text-gray-400 mt-0.5">
              Start a new group conversation
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <MaterialIcons name="close" size={22} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View className="px-4 py-2.5 border-b border-gray-100">
          <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
            <MaterialIcons name="search" size={20} color="#9CA3AF" />
            <BottomSheetTextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name or email..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 ml-2 text-base text-gray-900 p-0"
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons name="cancel" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Selected members chips */}
        {selectedUsers.length > 0 ? (
          <View className="border-b border-gray-100 py-2.5 px-4">
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Selected ({selectedUsers.length})
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row"
            >
              {selectedUsers.map(user => (
                <View
                  key={user.id}
                  className="flex-row items-center bg-emerald-50 border border-emerald-200 rounded-full pl-1.5 pr-2.5 py-1 mr-2"
                >
                  {user.photo ? (
                    <Image
                      source={{ uri: user.photo }}
                      style={{ width: 22, height: 22, borderRadius: 11 }}
                      className="mr-1.5 bg-gray-200"
                    />
                  ) : (
                    <View className="w-5 h-5 rounded-full bg-emerald-200 items-center justify-center mr-1.5">
                      <Text className="text-[10px] font-bold text-emerald-800">
                        {getInitials(user.name)}
                      </Text>
                    </View>
                  )}
                  <Text
                    className="text-xs font-semibold text-emerald-800 mr-1"
                    numberOfLines={1}
                  >
                    {user.name.split(' ')[0]}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeSelectedUser(user.id)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <MaterialIcons name="close" size={14} color="#047857" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            {/* Optional group name input */}
            <View className="mt-2.5">
              <BottomSheetTextInput
                value={customGroupName}
                onChangeText={setCustomGroupName}
                placeholder="Group name (optional)"
                placeholderTextColor="#9CA3AF"
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-gray-800"
                maxLength={50}
              />
            </View>
          </View>
        ) : null}

        {/* Candidate users list */}
        {isSearching ? (
          <View className="flex-1 items-center justify-center py-10">
            <ActivityIndicator size="small" color="#059669" />
            <Text className="text-xs text-gray-400 mt-2">
              Searching users...
            </Text>
          </View>
        ) : (
          <BottomSheetFlatList
            data={filteredUsers}
            keyExtractor={item => item.id}
            renderItem={renderUserItem}
            contentContainerStyle={{
              paddingBottom: 80,
            }}
            ListEmptyComponent={
              <View className="items-center justify-center py-16 px-6">
                <MaterialIcons name="person-search" size={40} color="#D1D5DB" />
                <Text className="text-sm font-semibold text-gray-500 mt-2">
                  No users found
                </Text>
                <Text className="text-xs text-gray-400 text-center mt-1">
                  {searchQuery.trim()
                    ? `No matches for "${searchQuery.trim()}"`
                    : 'Search by name or email to find people'}
                </Text>
              </View>
            }
          />
        )}

        {/* Action Button Footer */}
        <View
          style={{
            paddingBottom:
              Platform.OS === 'android'
                ? Math.max(insets.bottom, 16)
                : Math.max(insets.bottom, 12),
          }}
          className="px-5 pt-3 bg-white border-t border-gray-100"
        >
          <TouchableOpacity
            disabled={
              selectedUsers.length === 0 || createGroupMutation.isPending
            }
            onPress={handleCreateGroup}
            activeOpacity={0.8}
            className={`py-3.5 rounded-xl items-center flex-row justify-center ${
              selectedUsers.length > 0 && !createGroupMutation.isPending
                ? 'bg-emerald-600'
                : 'bg-gray-200'
            }`}
          >
            {createGroupMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons
                  name="group-add"
                  size={20}
                  color={selectedUsers.length > 0 ? '#FFFFFF' : '#9CA3AF'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  className={`text-base font-bold ${
                    selectedUsers.length > 0 ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  {selectedUsers.length === 0
                    ? 'Select members to add'
                    : selectedUsers.length === 1
                    ? 'Start Group Chat (1 Member)'
                    : `Start Group Chat (${selectedUsers.length} Members)`}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheetModal>
  );
}
