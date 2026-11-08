/**
 * WorkLocationMapScreen
 * Shows a work's location centered on a map with a marker.
 * If showAllNearby is true, shows all works near the user's location.
 *
 *  - Back button at the top returns to the previous screen.
 *  - "OK" button at the bottom also returns to the previous screen.
 */

import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MapView, { Marker, Region } from 'react-native-maps';
import { HomeStackParamList } from '../../types';
import { useHideTabBar } from '../../navigation/useHideTabBar';
import { useWorks } from '../../hooks/useWorks';

type WorkLocationMapNavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  'WorkLocationMap'
>;
type WorkLocationMapRouteProp = RouteProp<
  HomeStackParamList,
  'WorkLocationMap'
>;

export function WorkLocationMapScreen(): React.JSX.Element {
  useHideTabBar();
  const navigation = useNavigation<WorkLocationMapNavigationProp>();
  const route = useRoute<WorkLocationMapRouteProp>();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'android' ? insets.bottom : 0;

  const { latitude, longitude, address, showAllNearby } = route.params;

  const nearMe = React.useMemo(() => {
    if (showAllNearby) {
      return {
        latitude,
        longitude,
        rangeKm: 50,
      };
    }
    return undefined;
  }, [showAllNearby, latitude, longitude]);

  const { data: works } = useWorks(nearMe);

  const region: Region = {
    latitude,
    longitude,
    latitudeDelta: showAllNearby ? 0.05 : 0.01,
    longitudeDelta: showAllNearby ? 0.05 : 0.01,
  };

  return (
    <View className="flex-1 bg-white">
      {/* Safe area top spacer */}
      <View style={{ height: insets.top }} className="bg-white" />

      {/* Header with back button */}
      <View className="bg-white border-b border-gray-200">
        <View className="flex-row items-center px-3 py-3">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mr-2 p-2"
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <MaterialIcons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View className="flex-1 mr-2">
            <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>
              {showAllNearby ? 'Work Locations Near You' : 'Location'}
            </Text>
            {address ? (
              <Text className="text-xs text-gray-500" numberOfLines={1}>
                {address}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Map centered on the location */}
      <View className="flex-1">
        <MapView
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          initialRegion={region}
        >
          {showAllNearby ? (
            <>
              {/* User location marker */}
              <Marker
                coordinate={{ latitude, longitude }}
                title="Your Location"
                description={address}
                pinColor="blue"
              />
              {/* Nearby works markers */}
              {works?.map(w => {
                if (w.latitude == null || w.longitude == null) return null;
                return (
                  <Marker
                    key={w.id}
                    coordinate={{
                      latitude: w.latitude,
                      longitude: w.longitude,
                    }}
                    title={w.title || w.category}
                    description={w.description}
                    onCalloutPress={() => {
                      navigation.navigate('WorkDetail', { workId: w.id });
                    }}
                  />
                );
              })}
            </>
          ) : (
            <Marker
              coordinate={{ latitude, longitude }}
              title={address || 'Work location'}
            />
          )}
        </MapView>
      </View>

      {/* Bottom OK button */}
      <View
        className="bg-white border-t border-gray-200 px-5 py-4"
        style={{ paddingBottom: bottomPad + 16 }}
      >
        <TouchableOpacity
          className="rounded-xl py-4 items-center bg-emerald-600"
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <Text className="text-base font-bold text-white">OK</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
