/**
 * WorkCommentsScreen
 * Public comment thread for a work listing.
 *
 * Features:
 * - Work context card at the top (title + description snippet)
 * - Scrollable comment thread (newest first)
 * - "Poster" emerald badge on work owner's comments
 * - 👍 like toggle per comment with optimistic count
 * - Long-press your own comment to delete it
 * - Pinned keyboard-aware composer at the bottom
 * - Login prompt replaces composer for unauthenticated users
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/useAuthStore';
import {
  useComments,
  usePostComment,
  useDeleteComment,
  useToggleLike,
} from '../../hooks/useComments';
import { useHideTabBar } from '../../navigation/useHideTabBar';
import { HomeStackParamList, WorkComment } from '../../types';
import { getInitials } from '../conversation/helpers';

// ─── Navigation types ─────────────────────────────────────────

type Nav = NativeStackNavigationProp<HomeStackParamList, 'WorkComments'>;
type Route = RouteProp<HomeStackParamList, 'WorkComments'>;

// ─── Helpers ──────────────────────────────────────────────────

function formatRelativeDate(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// ─── Comment item ─────────────────────────────────────────────

interface CommentItemProps {
  comment: WorkComment;
  currentUserId: string | undefined;
  posterUserId: string;
  onLike: (commentId: string, liked: boolean) => void;
  onDelete: (commentId: string) => void;
}

function CommentItem({
  comment,
  currentUserId,
  posterUserId,
  onLike,
  onDelete,
}: CommentItemProps) {
  const isOwn = currentUserId === comment.authorId;
  const isPoster = comment.authorId === posterUserId;
  const isOptimistic = comment.id.startsWith('optimistic-');

  return (
    <TouchableOpacity
      activeOpacity={isOwn ? 0.7 : 1}
      onLongPress={
        isOwn
          ? () =>
              Alert.alert('Delete comment', 'Remove your comment?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => onDelete(comment.id),
                },
              ])
          : undefined
      }
    >
      <View className="flex-row items-start px-4 py-3">
        {/* Avatar */}
        {comment.authorPhoto ? (
          <Image
            source={{ uri: comment.authorPhoto }}
            style={{ width: 36, height: 36, borderRadius: 18 }}
            className="bg-gray-200"
          />
        ) : (
          <View className="w-9 h-9 rounded-full bg-emerald-100 items-center justify-center">
            <Text className="text-xs font-bold text-emerald-700">
              {getInitials(comment.authorName)}
            </Text>
          </View>
        )}

        {/* Bubble */}
        <View className="flex-1 ml-3">
          {/* Name row */}
          <View className="flex-row items-center flex-wrap gap-x-1.5 mb-0.5">
            <Text className="text-sm font-semibold text-gray-900">
              {comment.authorName}
            </Text>
            {isPoster && (
              <View className="rounded-full bg-emerald-100 px-2 py-0.5">
                <Text className="text-[10px] font-semibold text-emerald-700 tracking-wide">
                  Poster
                </Text>
              </View>
            )}
            {isOwn && !isPoster && (
              <View className="rounded-full bg-blue-50 px-2 py-0.5">
                <Text className="text-[10px] font-semibold text-blue-500 tracking-wide">
                  You
                </Text>
              </View>
            )}
            <Text className="text-xs text-gray-400 ml-auto">
              {formatRelativeDate(comment.createdAt)}
            </Text>
          </View>

          {/* Comment text */}
          <Text className="text-sm text-gray-800 leading-5">
            {comment.text}
          </Text>

          {/* Like row */}
          {!isOptimistic && (
            <View className="flex-row items-center mt-1.5">
              <TouchableOpacity
                onPress={() => onLike(comment.id, comment.likedByMe)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                className="flex-row items-center"
                accessibilityRole="button"
                accessibilityLabel={comment.likedByMe ? 'Unlike' : 'Like'}
              >
                <MaterialIcons
                  name={comment.likedByMe ? 'thumb-up' : 'thumb-up-off-alt'}
                  size={14}
                  color={comment.likedByMe ? '#059669' : '#9CA3AF'}
                />
                {comment.likeCount > 0 && (
                  <Text
                    className={`text-xs ml-1 ${
                      comment.likedByMe ? 'text-emerald-600' : 'text-gray-400'
                    }`}
                  >
                    {comment.likeCount}
                  </Text>
                )}
              </TouchableOpacity>
              {isOwn && <Text className="text-xs text-gray-300 mx-2">·</Text>}
              {isOwn && (
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert('Delete comment', 'Remove your comment?', [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => onDelete(comment.id),
                      },
                    ])
                  }
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel="Delete comment"
                >
                  <Text className="text-xs text-gray-400">Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Work context card (top of list) ─────────────────────────

function WorkContextCard({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) {
  if (!title && !description) return null;
  return (
    <View className="mx-4 mt-4 mb-2 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
      {title ? (
        <Text
          className="text-sm font-semibold text-emerald-800 mb-0.5"
          numberOfLines={2}
        >
          {title}
        </Text>
      ) : null}
      {description ? (
        <Text className="text-xs text-emerald-700 leading-4" numberOfLines={3}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}

// ─── Login prompt (replaces composer) ────────────────────────

function LoginPrompt({ onLogin }: { onLogin: () => void }) {
  return (
    <View className="border-t border-gray-100 bg-white px-4 py-3 flex-row items-center">
      <Text className="flex-1 text-sm text-gray-400">
        Log in to join the conversation
      </Text>
      <TouchableOpacity
        onPress={onLogin}
        className="bg-emerald-600 rounded-full px-4 py-2"
        accessibilityRole="button"
      >
        <Text className="text-xs font-semibold text-white">Log in</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Composer ─────────────────────────────────────────────────

interface ComposerProps {
  user: { photo?: string; name?: string } | null;
  onSubmit: (text: string) => void;
  isSending: boolean;
}

function Composer({ user, onSubmit, isSending }: ComposerProps) {
  const [text, setText] = useState('');

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setText('');
  }

  return (
    <View className="border-t border-gray-100 bg-white px-3 py-2 flex-row items-end">
      {/* User avatar */}
      {user?.photo ? (
        <Image
          source={{ uri: user.photo }}
          style={{ width: 32, height: 32, borderRadius: 16 }}
          className="bg-gray-200 mr-2 mb-0.5"
        />
      ) : (
        <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center mr-2 mb-0.5">
          <Text className="text-xs font-bold text-emerald-700">
            {getInitials(user?.name || '?')}
          </Text>
        </View>
      )}

      {/* Input */}
      <View className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 min-h-[36px] max-h-24">
        <TextInput
          value={text}
          onChangeText={t => setText(t.slice(0, 500))}
          placeholder="Write a comment…"
          placeholderTextColor="#9CA3AF"
          multiline
          className="text-sm text-gray-900 p-0 m-0"
          style={{ maxHeight: 80 }}
          returnKeyType="default"
          blurOnSubmit={false}
        />
      </View>

      {/* Send button */}
      <TouchableOpacity
        onPress={handleSend}
        disabled={isSending || !text.trim()}
        className="ml-2 mb-0.5 w-9 h-9 rounded-full bg-emerald-600 items-center justify-center"
        style={{ opacity: isSending || !text.trim() ? 0.4 : 1 }}
        accessibilityRole="button"
        accessibilityLabel="Send comment"
      >
        {isSending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <MaterialIcons name="send" size={16} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────

export function WorkCommentsScreen(): React.JSX.Element {
  useHideTabBar();

  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { workId, workTitle, workDescription, posterUserId } = route.params;

  const { user, isAuthenticated } = useAuthStore();

  const { data: comments = [], isLoading, isError } = useComments(workId);
  const postMutation = usePostComment(workId);
  const deleteMutation = useDeleteComment(workId);
  const likeMutation = useToggleLike(workId);

  const listRef = useRef<FlatList<WorkComment>>(null);

  const handlePost = useCallback(
    (text: string) => {
      postMutation.mutate(text);
    },
    [postMutation],
  );

  const handleDelete = useCallback(
    (commentId: string) => {
      deleteMutation.mutate(commentId);
    },
    [deleteMutation],
  );

  const handleLike = useCallback(
    (commentId: string, liked: boolean) => {
      likeMutation.mutate({ commentId, liked });
    },
    [likeMutation],
  );

  const handleLoginPress = useCallback(() => {
    (navigation as any).navigate('Login');
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }: { item: WorkComment }) => (
      <CommentItem
        comment={item}
        currentUserId={user?.id}
        posterUserId={posterUserId}
        onLike={handleLike}
        onDelete={handleDelete}
      />
    ),
    [user?.id, posterUserId, handleLike, handleDelete],
  );

  const keyExtractor = useCallback((item: WorkComment) => item.id, []);

  const ListHeader = (
    <WorkContextCard title={workTitle} description={workDescription} />
  );

  const ListEmpty = (
    <View className="items-center justify-center py-16 px-8">
      <MaterialIcons name="chat-bubble-outline" size={40} color="#D1D5DB" />
      <Text className="text-base font-semibold text-gray-400 mt-4 text-center">
        No comments yet
      </Text>
      <Text className="text-sm text-gray-300 mt-1 text-center leading-5">
        Be the first to ask a question or share something useful!
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-white">
      {/* ── Header ── */}
      <View className="bg-white border-b border-gray-100">
        <View style={{ height: insets.top }} />
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="p-1.5 rounded-full mr-2"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialIcons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900">Comments</Text>
            {comments.length > 0 && (
              <Text className="text-xs text-gray-400">
                {comments.length}{' '}
                {comments.length === 1 ? 'comment' : 'comments'}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* ── Comment list ── */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#059669" />
          </View>
        ) : isError ? (
          <View className="flex-1 items-center justify-center px-8">
            <MaterialIcons name="cloud-off" size={40} color="#D1D5DB" />
            <Text className="text-base text-gray-400 mt-4 text-center">
              Comments aren't available yet
            </Text>
            <Text className="text-sm text-gray-300 mt-1 text-center leading-5">
              Check back soon — this feature is coming!
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={comments}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={ListEmpty}
            contentContainerStyle={{
              paddingBottom: 16,
              flexGrow: 1,
            }}
            ItemSeparatorComponent={() => (
              <View className="h-px bg-gray-50 ml-16" />
            )}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* ── Composer / Login prompt ── */}
        {isAuthenticated && user ? (
          <Composer
            user={{ photo: user.photo || undefined, name: user.name }}
            onSubmit={handlePost}
            isSending={postMutation.isPending}
          />
        ) : (
          <LoginPrompt onLogin={handleLoginPress} />
        )}

        {/* Bottom safe area */}
        <View style={{ height: insets.bottom }} className="bg-white" />
      </KeyboardAvoidingView>
    </View>
  );
}
