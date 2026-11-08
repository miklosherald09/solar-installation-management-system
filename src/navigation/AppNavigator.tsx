/**
 * AppNavigator
 * Root navigator — always shows the main tab navigator so the
 * HomeScreen (work feed) is accessible to everyone.  The Login
 * screen is inside HomeStack and is navigated to when an
 * unauthenticated user taps "Add new work".
 *
 *   RootStack
 *   └── Main  →  Tab.Navigator
 *       ├── HomeTab     →  HomeStack (includes Login screen)
 *       ├── MessagesTab →  MessagesStack
 *       └── ProfileTab  →  ProfileStack
 *
 * Tab bar visibility is now driven by `useTabBarStore` + `AnimatedTabBar`
 * (see ../components/AnimatedTabBar and ../hooks/useHideTabBar), not by
 * matching `getFocusedRouteNameFromRoute` to a hardcoded list of route
 * names. Screens that should hide the bar call `useHideTabBar()` in their
 * body instead. This gives a smooth slide animation and avoids the old
 * `Object.assign` merge issue where `tabBarStyle: undefined` clobbered the
 * shared style and made the bar snap to its default (taller) height.
 */

import React from 'react';
import { Platform, Image, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { HomeScreen } from '../screens/home/HomeScreen';
import { WorkDetailScreen } from '../screens/workdetail/WorkDetailScreen';
import { WorkSettingsScreen } from '../screens/workdetail/WorkSettingsScreen';
import { EditWorkLocationScreen } from '../screens/workdetail/EditWorkLocationScreen';
import { EditWorkScreen } from '../screens/editwork/EditWorkScreen';
import { WorkLocationMapScreen } from '../screens/workdetail/WorkLocationMapScreen';
import { ConversationScreen } from '../screens/conversation/ConversationScreen';
import { MessagesScreen } from '../screens/messages/MessagesScreen';
import {
  ProfileSettingsScreen,
  EditProfileScreen,
  AccountSecurityScreen,
  DeleteAccountScreen,
  NotificationSettingsScreen,
  HelpSupportScreen,
} from '../screens/profileSettings';
import { PostWorkScreen } from '../screens/postWork/PostWorkScreen';
import { AddedWorkScreen } from '../screens/addedwork/AddedWorkScreen';
import { SelectLocationScreen } from '../screens/SelectLocationScreen';
import { SelectWorkTypeScreen } from '../screens/selectWorkType/SelectWorkTypeScreen';
import { UpdateLocationScreen } from '../screens/UpdateLocationScreen';
import { UploadWorkPictureScreen } from '../screens/UploadWorkPictureScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { SearchResultsListScreen } from '../screens/search/SearchResultsListScreen';
import { NearbyWorkersListScreen } from '../screens/nearbyWorkers/NearbyWorkersListScreen';
import { NearbyWorksListScreen } from '../screens/nearbyWorks/NearbyWorksListScreen';
import { UserProfileScreen } from '../screens/userProfile/UserProfileScreen';
import { UserReviewsScreen } from '../screens/userProfile/UserReviewsScreen';
import { UserProfileSettingsScreen } from '../screens/userProfileSettings/UserProfileSettingsScreen';
import { RecentSearchesScreen } from '../screens/RecentSearchesScreen';
import { CallScreen } from '../screens/call/CallScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { WorkCommentsScreen } from '../screens/comments/WorkCommentsScreen';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import {
  useNotificationUnreadCount,
  useMarkAllNotificationsRead,
  notificationKeys,
  useMessagingUnreadCount,
  conversationKeys,
} from '../hooks';
import { AnimatedTabBar } from './AnimatedTabBar';
import {
  RootStackParamList,
  HomeStackParamList,
  MessagesStackParamList,
  ProfileStackParamList,
  NotificationsStackParamList,
  TabParamList,
} from '../types';

// ---------------------------------------------------------------------------
// Navigators
// ---------------------------------------------------------------------------

const RootStack = createNativeStackNavigator<RootStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const MessagesStack = createNativeStackNavigator<MessagesStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const NotificationsStack =
  createNativeStackNavigator<NotificationsStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// ---------------------------------------------------------------------------
// Tab icon
// ---------------------------------------------------------------------------

type TabIconName = React.ComponentProps<typeof MaterialIcons>['name'];

function TabIcon({ name, focused }: { name: TabIconName; focused: boolean }) {
  return (
    <MaterialIcons
      name={name}
      size={30}
      color="#006742"
      style={{ opacity: focused ? 1 : 0.5 }}
    />
  );
}

// ---------------------------------------------------------------------------
// Stack navigators
// ---------------------------------------------------------------------------

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="Search" component={SearchScreen} />
      <HomeStack.Screen
        name="RecentSearches"
        component={RecentSearchesScreen}
      />
      <HomeStack.Screen
        name="SearchResultsList"
        component={SearchResultsListScreen}
      />
      <HomeStack.Screen
        name="NearbyWorkersList"
        component={NearbyWorkersListScreen}
      />
      <HomeStack.Screen
        name="NearbyWorksList"
        component={NearbyWorksListScreen}
      />
      <HomeStack.Screen name="WorkDetail" component={WorkDetailScreen} />
      <HomeStack.Screen name="WorkSettings" component={WorkSettingsScreen} />
      <HomeStack.Screen
        name="EditWorkLocation"
        component={EditWorkLocationScreen}
      />
      <HomeStack.Screen name="EditWork" component={EditWorkScreen} />
      <HomeStack.Screen
        name="WorkLocationMap"
        component={WorkLocationMapScreen}
      />
      <HomeStack.Screen
        name="ConversationDetail"
        component={ConversationScreen}
      />
      <HomeStack.Screen name="Call" component={CallScreen} />
      <HomeStack.Screen name="UserProfile" component={UserProfileScreen} />
      <HomeStack.Screen
        name="UserProfileSettings"
        component={UserProfileSettingsScreen}
      />
      <HomeStack.Screen name="PostWork" component={PostWorkScreen} />
      <HomeStack.Screen name="AddedWork" component={AddedWorkScreen} />
      <HomeStack.Screen
        name="SelectLocation"
        component={SelectLocationScreen}
      />
      <HomeStack.Screen
        name="SelectWorkType"
        component={SelectWorkTypeScreen}
      />
      <HomeStack.Screen
        name="UpdateLocation"
        component={UpdateLocationScreen}
      />
      <HomeStack.Screen
        name="UploadWorkPicture"
        component={UploadWorkPictureScreen}
      />
      <HomeStack.Screen name="Login" component={LoginScreen} />
      <HomeStack.Screen name="UserReviews" component={UserReviewsScreen} />
      <HomeStack.Screen name="WorkComments" component={WorkCommentsScreen} />
    </HomeStack.Navigator>
  );
}

function MessagesStackNavigator() {
  return (
    <MessagesStack.Navigator screenOptions={{ headerShown: false }}>
      <MessagesStack.Screen name="Messages" component={MessagesScreen} />
      <MessagesStack.Screen
        name="ConversationDetail"
        component={ConversationScreen}
      />
      <MessagesStack.Screen name="Call" component={CallScreen} />
      <MessagesStack.Screen name="WorkDetail" component={WorkDetailScreen} />
      <MessagesStack.Screen
        name="WorkSettings"
        component={WorkSettingsScreen}
      />
      <MessagesStack.Screen
        name="EditWorkLocation"
        component={EditWorkLocationScreen}
      />
      <MessagesStack.Screen name="EditWork" component={EditWorkScreen} />
      <MessagesStack.Screen
        name="SelectLocation"
        component={SelectLocationScreen}
      />
      <MessagesStack.Screen
        name="WorkLocationMap"
        component={WorkLocationMapScreen}
      />
      <MessagesStack.Screen name="UserProfile" component={UserProfileScreen} />
      <MessagesStack.Screen
        name="UserProfileSettings"
        component={UserProfileSettingsScreen}
      />
      <MessagesStack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <MessagesStack.Screen name="UserReviews" component={UserReviewsScreen} />
      <MessagesStack.Screen
        name="NearbyWorkersList"
        component={NearbyWorkersListScreen}
      />
      <MessagesStack.Screen
        name="WorkComments"
        component={WorkCommentsScreen}
      />
    </MessagesStack.Navigator>
  );
}

function ProfileStackNavigator() {
  // The bar is hidden for the entire Profile tab, regardless of which
  // useHideTabBar();

  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="UserProfile" component={UserProfileScreen} />
      <ProfileStack.Screen
        name="ProfileSettings"
        component={ProfileSettingsScreen}
      />
      <ProfileStack.Screen name="AddedWork" component={AddedWorkScreen} />
      <ProfileStack.Screen name="PostWork" component={PostWorkScreen} />
      <ProfileStack.Screen
        name="SelectLocation"
        component={SelectLocationScreen}
      />
      <ProfileStack.Screen
        name="SelectWorkType"
        component={SelectWorkTypeScreen}
      />
      <ProfileStack.Screen
        name="UpdateLocation"
        component={UpdateLocationScreen}
      />
      <ProfileStack.Screen
        name="UploadWorkPicture"
        component={UploadWorkPictureScreen}
      />
      <ProfileStack.Screen name="WorkDetail" component={WorkDetailScreen} />
      <ProfileStack.Screen name="WorkSettings" component={WorkSettingsScreen} />
      <ProfileStack.Screen
        name="EditWorkLocation"
        component={EditWorkLocationScreen}
      />
      <ProfileStack.Screen name="EditWork" component={EditWorkScreen} />
      <ProfileStack.Screen
        name="WorkLocationMap"
        component={WorkLocationMapScreen}
      />
      <ProfileStack.Screen
        name="AccountSecurity"
        component={AccountSecurityScreen}
      />
      <ProfileStack.Screen
        name="DeleteAccount"
        component={DeleteAccountScreen}
      />
      <ProfileStack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
      />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
      <ProfileStack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <ProfileStack.Screen name="Login" component={LoginScreen} />
      <ProfileStack.Screen
        name="ConversationDetail"
        component={ConversationScreen}
      />
      <ProfileStack.Screen name="UserReviews" component={UserReviewsScreen} />
      <ProfileStack.Screen name="WorkComments" component={WorkCommentsScreen} />
    </ProfileStack.Navigator>
  );
}

function NotificationsStackNavigator() {
  return (
    <NotificationsStack.Navigator screenOptions={{ headerShown: false }}>
      <NotificationsStack.Screen
        name="Notifications"
        component={NotificationsScreen}
      />
      <NotificationsStack.Screen
        name="WorkDetail"
        component={WorkDetailScreen}
      />
      <NotificationsStack.Screen
        name="WorkSettings"
        component={WorkSettingsScreen}
      />
      <NotificationsStack.Screen
        name="EditWorkLocation"
        component={EditWorkLocationScreen}
      />
      <NotificationsStack.Screen name="EditWork" component={EditWorkScreen} />
      <NotificationsStack.Screen
        name="WorkLocationMap"
        component={WorkLocationMapScreen}
      />
      <NotificationsStack.Screen
        name="ConversationDetail"
        component={ConversationScreen}
      />
      <NotificationsStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
      />
      <NotificationsStack.Screen
        name="UserProfileSettings"
        component={UserProfileSettingsScreen}
      />
      <NotificationsStack.Screen
        name="UserReviews"
        component={UserReviewsScreen}
      />
      <NotificationsStack.Screen
        name="WorkComments"
        component={WorkCommentsScreen}
      />
    </NotificationsStack.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Main tabs (shown when authenticated)
// ---------------------------------------------------------------------------

function MainTabs() {
  // Bottom inset of the Android system navigation bar. React Native 0.86 runs
  // edge-to-edge, so the window extends underneath the gesture bar / 3-button
  // nav. The default BottomTabBar would add this inset to its height and
  // padding, but a custom `height` in `tabBarStyle` overrides that logic — so
  // we add it explicitly here to keep the tab bar from being covered by the
  // system navigation bar on a physical device.
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'android' ? insets.bottom : 0;
  const navigation = useNavigation<any>();

  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const { data: unreadData } = useNotificationUnreadCount();
  const unreadCount = unreadData?.count ?? 0;
  const { data: messagesUnreadData } = useMessagingUnreadCount();
  const messagesUnreadCount = messagesUnreadData?.count ?? 0;
  // const markAllMessagesReadMutation = useMarkAllMessagesRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  // Redirect to Home Screen when user logs out
  const prevAuthRef = React.useRef(isAuthenticated);
  React.useEffect(() => {
    if (prevAuthRef.current && !isAuthenticated) {
      navigation.navigate('Main', {
        screen: 'HomeTab',
        params: { screen: 'Home' },
      });
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated, navigation]);

  return (
    <Tab.Navigator
      tabBar={props => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#0088FF',
        tabBarInactiveTintColor: '#0088FF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: (Platform.OS === 'ios' ? 20 : 10) + bottomPad,
          paddingHorizontal: 16,
          height: (Platform.OS === 'ios' ? 72 : 64) + bottomPad,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="MessagesTab"
        component={MessagesStackNavigator}
        listeners={{
          tabPress: () => {
            if (user?.id) {
              // Hide the badge immediately…
              queryClient.setQueryData(conversationKeys.unreadCount(user.id), {
                count: 0,
              });
              // …then reset every Cassandra per-conversation unread counter
              // (PATCH /messaging/messages/read-all) so the badge stays 0.
              // markAllMessagesReadMutation.mutate();
            }
          },
        }}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="chat-bubble" focused={focused} />
          ),
          tabBarBadge:
            messagesUnreadCount > 0 ? messagesUnreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#DC2626',
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: 'bold',
          },
        }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsStackNavigator}
        listeners={{
          tabPress: () => {
            if (user?.id) {
              // Reset badge count to 0 in query cache immediately
              queryClient.setQueryData(notificationKeys.unreadCount(user.id), {
                count: 0,
              });
              // Call mutation to mark all read in the background
              markAllReadMutation.mutate();
            }
          },
        }}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="public" focused={focused} />
          ),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#DC2626',
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: 'bold',
          },
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          popToTopOnBlur: true,
          tabBarIcon: ({ focused }) => (
            <TabIcon name="person" focused={focused} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: e => {
            e.preventDefault();
            navigation.navigate('ProfileTab', {
              screen: 'UserProfile',
              params: undefined,
            });
          },
        })}
      />
    </Tab.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Root navigator (auth gate)
// ---------------------------------------------------------------------------

export function AppNavigator(): React.JSX.Element {
  const { isAuthenticated, user } = useAuthStore();

  if (user == null && isAuthenticated !== false) {
    return (
      <View className="flex-1 bg-[#444444] items-center justify-center">
        {/* Render the logo here instead of a generic blue spinner */}
        <Image
          source={require('../logos/splashicon.png')}
          resizeMode="contain"
          style={{ width: 240, height: 240 }}
        />
      </View>
    );
  }

  return (
    <BottomSheetModalProvider>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Main" component={MainTabs} />
        <RootStack.Screen name="Call" component={CallScreen} />
      </RootStack.Navigator>
    </BottomSheetModalProvider>
  );
}
