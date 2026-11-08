import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/useAuthStore';
import { useNearMeStore } from '../../store/useNearMeStore';
import { Avatar } from '../../components/Avatar';
import { HomeStackParamList } from '../../types';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

export const HEADER_HEIGHT = 112;

interface Props {
  headerTranslateY: any;
  onNearMePress: () => void;
}

export function HomeHeader({ headerTranslateY, onNearMePress }: Props) {
  const navigation = useNavigation<Nav>();
  const { isAuthenticated, user } = useAuthStore();
  const { conciseLocation, rangeKm } = useNearMeStore();

  // The pill is always visible so users can open the Near Me modal at any
  // time; fall back to defaults when no location filter is set yet.
  const activeNearMe = {
    conciseLocation: conciseLocation || '',
    rangeKm,
  };

  const handleCreateWorkPress = () => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
    } else {
      navigation.navigate('PostWork', {});
    }
  };

  const headerStyle = useAnimatedStyle(() => {
    // 0 = completely visible
    // -HEADER_HEIGHT = completely hidden
    const opacity = interpolate(
      headerTranslateY.value,
      [-HEADER_HEIGHT, -HEADER_HEIGHT * 0.9, 0],
      [0, 0.7, 1],
      Extrapolation.CLAMP,
    );
    return {
      transform: [
        {
          translateY: headerTranslateY.value,
        },
      ],
      opacity,
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.header,
          {
            height: HEADER_HEIGHT,
          },
          headerStyle,
        ]}
      >
        <View style={styles.headerContent}>
          {/* Top Bar: Brand, Near Me filter & Action buttons */}
          <View className="flex-row items-center justify-between h-9">
            <View className="flex-row items-center justify-start">
              <View className="ml-0 h-9 justify-center">
                <Text className="text-2xl font-bold text-[#006742]">
                  Workww
                </Text>
                <TouchableOpacity
                  className="flex-row items-center ml-auto  py-0"
                  activeOpacity={0.7}
                  accessibilityLabel="Near Me"
                  accessibilityRole="button"
                  onPress={onNearMePress}
                >
                  <MaterialIcons name="near-me" size={14} color="#047857" />
                  <Text
                    className="text-[11px] font-semibold text-emerald-700 ml-1 max-w-[200px]"
                    numberOfLines={1}
                  >
                    {activeNearMe.conciseLocation || 'Near Me'}
                    {' • '}
                    {activeNearMe.rangeKm} km
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="flex-row items-center">
              <TouchableOpacity
                className="mr-2 w-9 h-9 rounded-full bg-[#006742] items-center justify-center"
                activeOpacity={0.7}
                accessibilityLabel="Search works"
                accessibilityRole="button"
                onPress={() => navigation.navigate('Search')}
              >
                <MaterialIcons name="search" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                className="w-9 h-9 rounded-full bg-[#FFFFFF] border border-gray-200 items-center justify-center"
                activeOpacity={0.7}
                accessibilityLabel="My posted works"
                accessibilityRole="button"
                onPress={() => {
                  if (!isAuthenticated) {
                    navigation.navigate('Login');
                  } else {
                    navigation.navigate('AddedWork');
                  }
                }}
              >
                <MaterialIcons name="menu" size={22} color="#006742" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="mt-2.5 mb-2 flex-row items-center">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleCreateWorkPress}
              accessibilityLabel="User avatar"
            >
              <Avatar photo={user?.photo} size={36} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 ml-2.5 bg-white border border-gray-100 rounded-full px-4 py-2 flex-row items-center justify-between"
              activeOpacity={0.7}
              accessibilityLabel="Post a work or project or anything that requires a human effort to be done"
              accessibilityRole="button"
              onPress={handleCreateWorkPress}
            >
              <Text
                className="text-gray-500 text-[13px] font-normal"
                numberOfLines={1}
              >
                Post a work or task requiring human effort
              </Text>
              <MaterialIcons name="post-add" size={20} color="#006742" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    zIndex: 10,
  },

  headerContent: {
    height: HEADER_HEIGHT,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    justifyContent: 'space-between',
  },
});
