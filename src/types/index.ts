/**
 * Type definitions for the Solar Installation Management System app
 */

export type WorkCategory =
  | 'cleaning'
  | 'gardening'
  | 'pet_sitting'
  | 'car_wash'
  | 'repair'
  | 'moving'
  | 'painting'
  | 'construction'
  | 'electrical'
  | 'driver'
  | 'other';

export type WorkAvailability = 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';

export interface CategoryInfo {
  id: WorkCategory;
  label: string;
  /** MaterialIcons icon name (react-native-vector-icons/MaterialIcons) */
  icon: string;
  color: string;
}

/**
 * A geocoded location: a human-readable address plus its map coordinates.
 * Used when the user picks a location on the map or uses their current
 * location, and passed back to the PostWork screen via navigation params.
 */
export interface LocationInfo {
  address: string;
  latitude?: number;
  longitude?: number;
  /** Short city/state address (e.g., "Cebu City, Central Visayas"). */
  conciseAddress?: string;
}

/**
 * Work type backed by the database (backend `WorkType` model).
 * `image` is a plain image URL (e.g. http://bucket.image.com/image1.png)
 * persisted in the DB as text.
 */
export interface WorkType {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  image: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type WorkStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

export type WorkDurationUnit =
  | 'minutes'
  | 'hours'
  | 'days'
  | 'weeks'
  | 'months';

export interface Work {
  id: string;
  title?: string;
  description: string;
  category: WorkCategory;
  categories?: WorkCategory[] | string[];
  budget: number;
  budgetType: 'fixed' | 'hourly' | 'negotiable';
  location: string;
  latitude?: number;
  longitude?: number;
  distance?: string;
  conciseLocation?: string;
  contactPhone?: string;
  phoneCountryCode?: string;
  postedBy: User;
  acceptedUserIds?: string[];
  status: WorkStatus;
  applicants: number;
  images?: string[];
  createdAt: string;
  scheduledDate?: string;
  tags?: string[];
  /** How long the work is expected to take (e.g., 3 + days). */
  durationValue?: number;
  durationUnit?: WorkDurationUnit;
  currency?: string;
  reactionSummary?: WorkReactionSummary;
}

export interface WorkReactionUser {
  id: string;
  name: string;
  photo?: string | null;
}

export interface WorkReactionItem {
  id: string;
  userId: string;
  reaction: string;
  createdAt: string;
  user?: WorkReactionUser;
}

export interface WorkReactionSummary {
  workId: string;
  totalCount: number;
  userReaction: string | null;
  counts: Record<string, number>;
  reactions?: WorkReactionItem[];
}

export interface User {
  id: string;
  name: string;
  photo: string;
  rating: number;
  reviewCount: number;
  completedWorks: number;
  memberSince: string;
  bio?: string;
  location?: string;
  conciseLocation?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  phoneCountryCode?: string | null;
  email?: string;
  role?: 'USER' | 'ADMIN' | 'MODERATOR' | string;
  verifiedAt?: string | null;
  verifiedByUserId?: string | null;
}

export interface Review {
  id: string;
  workId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar: string;
  rating: number;
  comment: string;
  createdAt: string;
}

/** A public comment posted on a work listing. */
export interface WorkComment {
  id: string;
  workId: string;
  authorId: string;
  authorName: string;
  authorPhoto: string | null;
  text: string;
  likeCount: number;
  likedByMe: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  sender: User;
  preview: string;
  timestamp: string;
  unread: boolean;
  workTitle?: string;
}

/**
 * A conversation preview shown in the Messages list.
 * Maps to the backend IConversationListItem (Cassandra conversations_by_user table).
 */
export interface ConversationPreview {
  id: string;
  userId: string;
  photo: string | null;
  title: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  partner: {
    id: string;
    name: string;
    photo: string | null;
    phone?: string | null;
    email?: string | null;
    isOnline?: boolean;
    status?: string;
  };
  participants: string[];
  unreadCount: number;
  isGroup: boolean;
  workId: string | null;
  /** Whether the conversation is archived (hidden) for the current user. */
  isArchived: boolean;
  /** Whether notifications are muted for this conversation. */
  isMuted: boolean;
  /** Whether this conversation is pinned for the current user. */
  isPinned: boolean;
}

/**
 * A single chat message within a conversation.
 * Maps to the backend IMessageEnriched shape.
 */
export interface ConversationMessage {
  /** Timeuuid of the message */
  id: string;
  /** UUID of the conversation */
  conversationId: string;
  /** UUID of the sender */
  senderId: string;
  /** Sender''s display name (enriched from PostgreSQL) */
  senderName?: string;
  /** Sender''s photo URL (enriched from PostgreSQL) */
  senderPhoto?: string | null;
  /** Text body of the message */
  content: string;
  /** ISO-8601 timestamp of when the message was sent (derived from timeuuid) */
  createdAt: string;
  /** Optional attachment URLs */
  attachments?: string[];
}

import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  Call: {
    destination?: string;
    displayName?: string;
    photo?: string | null;
    isVideo?: boolean;
  };
};

export type TabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList> | undefined;
  MessagesTab: NavigatorScreenParams<MessagesStackParamList> | undefined;
  NotificationsTab:
    | NavigatorScreenParams<NotificationsStackParamList>
    | undefined;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  Search: undefined;
  RecentSearches: undefined;
  SearchResultsList: {
    type: 'people' | 'works';
    query: string;
  };
  WorkDetail: { workId: string; origin?: string };
  WorkSettings: { workId: string };
  EditWorkLocation: { workId: string };
  EditWork: {
    workId: string;
    field:
      | 'reward'
      | 'description'
      | 'workType'
      | 'duration'
      | 'images'
      | 'tags';
  };
  WorkLocationMap: {
    latitude: number;
    longitude: number;
    address?: string;
    showAllNearby?: boolean;
  };
  ConversationDetail: {
    conversationId: string;
    partnerName: string;
    partnerPhoto?: string | null;
    partnerId: string;
    partnerPhone?: string | null;
    workId?: string;
  };
  Call: {
    destination: string;
    displayName?: string;
    photo?: string | null;
    isVideo?: boolean;
  };
  UserProfile: { userId?: string; workId?: string } | undefined;
  UserProfileSettings: { userId: string };
  PostWork: { location?: LocationInfo; workType?: WorkType };
  AddedWork: undefined;
  SelectLocation: { mode?: 'nearMe' | 'work' | 'profile' } | undefined;
  SelectWorkType: undefined;
  UpdateLocation: undefined;
  UploadWorkPicture: undefined;
  NearbyWorkersList: {
    latitude: number;
    longitude: number;
    rangeKm: number;
    conciseLocation?: string;
    location?: string;
  };
  NearbyWorksList: {
    latitude: number;
    longitude: number;
    rangeKm: number;
    conciseLocation?: string;
    location?: string;
  };
  Login: undefined;
  UserReviews: { userId: string };
  WorkComments: {
    workId: string;
    workTitle?: string;
    workDescription?: string;
    posterUserId: string;
  };
};

export type SearchStackParamList = {
  Search: undefined;
  WorkDetail: { workId: string };
};

export type PostWorkStackParamList = {
  PostWork: undefined;
};

export type MessagesStackParamList = {
  Messages: undefined;
  ConversationDetail: {
    conversationId: string;
    partnerName: string;
    partnerPhoto?: string | null;
    partnerId: string;
    partnerPhone?: string | null;
    workId?: string;
  };
  Call: {
    destination: string;
    displayName?: string;
    photo?: string | null;
    isVideo?: boolean;
  };
  WorkDetail: { workId: string; origin: string };
  WorkSettings: { workId: string };
  EditWorkLocation: { workId: string };
  EditWork: {
    workId: string;
    field:
      | 'reward'
      | 'description'
      | 'workType'
      | 'duration'
      | 'images'
      | 'tags';
  };
  SelectLocation: undefined;
  WorkLocationMap: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  UserProfile: { userId?: string; workId?: string } | undefined;
  UserProfileSettings: { userId: string };
  HelpSupport: undefined;
  UserReviews: { userId: string };
  NearbyWorkersList: {
    latitude: number;
    longitude: number;
    rangeKm: number;
    conciseLocation?: string;
    location?: string;
  };
  WorkComments: {
    workId: string;
    workTitle?: string;
    workDescription?: string;
    posterUserId: string;
  };
};

export type ProfileStackParamList = {
  ProfileSettings: undefined;
  AddedWork: undefined;
  PostWork: { location?: LocationInfo; workType?: WorkType };
  WorkDetail: { workId: string };
  WorkSettings: { workId: string };
  EditWorkLocation: { workId: string };
  EditWork: {
    workId: string;
    field:
      | 'reward'
      | 'description'
      | 'workType'
      | 'duration'
      | 'images'
      | 'tags';
  };
  WorkLocationMap: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  EditProfile: undefined;
  SelectLocation: undefined;
  SelectWorkType: undefined;
  UpdateLocation: undefined;
  UploadWorkPicture: undefined;
  AccountSecurity: undefined;
  NotificationSettings: undefined;
  DeleteAccount: undefined;
  HelpSupport: undefined;
  Login: undefined;
  ConversationDetail: {
    conversationId: string;
    partnerName: string;
    partnerPhoto?: string | null;
    partnerId: string;
    partnerPhone?: string | null;
    workId?: string;
  };
  UserProfile: { userId?: string; workId?: string } | undefined;
  UserReviews: { userId: string };
  WorkComments: {
    workId: string;
    workTitle?: string;
    workDescription?: string;
    posterUserId: string;
  };
};

export type NotificationsStackParamList = {
  Notifications: undefined;
  WorkDetail: { workId: string; origin?: string };
  WorkSettings: { workId: string };
  EditWorkLocation: { workId: string };
  EditWork: {
    workId: string;
    field:
      | 'reward'
      | 'description'
      | 'workType'
      | 'duration'
      | 'images'
      | 'tags';
  };
  WorkLocationMap: {
    latitude: number;
    longitude: number;
    address?: string;
    showAllNearby?: boolean;
  };
  ConversationDetail: {
    conversationId: string;
    partnerName: string;
    partnerPhoto?: string | null;
    partnerId: string;
    partnerPhone?: string | null;
    workId?: string;
  };
  UserProfile: { userId?: string; workId?: string } | undefined;
  UserProfileSettings: { userId: string };
  UserReviews: { userId: string };
  WorkComments: {
    workId: string;
    workTitle?: string;
    workDescription?: string;
    posterUserId: string;
  };
};

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  data?: {
    workId?: string;
    conversationId?: string;
    partnerName?: string;
    partnerPhoto?: string | null;
    partnerId?: string;
    changedFields?: string;
  } | null;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}
