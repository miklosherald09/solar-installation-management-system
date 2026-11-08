/**
 * Hooks
 * Custom React hooks for the application
 */

export {
  useWorks,
  useUserWorks,
  useUserCompletedWorks,
  useWork,
  useCreateWork,
  useApplyToWork,
  workKeys,
} from './useWorks';
export { useWorkTypes, workTypeKeys } from './useWorkTypes';
export {
  useConversations,
  useMessages,
  useCreateWorkConversation,
  useCheckExistingWorkConversation,
  useSendMessage,
  useMessagingUnreadCount,
  useMarkAllMessagesRead,
  conversationKeys,
} from './useConversations';
export {
  useRecentSearches,
  useLogSearch,
  useAllSearches,
  useDeleteSearchLog,
  searchLogKeys,
} from './useSearchLogs';
export { useWorkCurrency } from './useWorkCurrency';
export {
  useNotifications,
  useNotificationUnreadCount,
  useNotificationMessagesUnreadCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useMarkAllMessagesNotificationsRead,
  notificationKeys,
} from './useNotifications';
export {
  useCredibility,
  useUserReviews,
  useHasReviewed,
  useCreateReview,
  reviewKeys,
} from './useReviews';
export { useNearbyWorkers, nearbyWorkerKeys } from './useNearbyWorkers';
export { useUpdateWorkAvailability } from './useWorkAvailability';
export {
  useComments,
  usePostComment,
  useDeleteComment,
  useToggleLike,
  commentKeys,
} from './useComments';
export {
  useWorkReactions,
  useToggleWorkReaction,
  useRemoveWorkReaction,
  workReactionKeys,
} from './useWorkReactions';
