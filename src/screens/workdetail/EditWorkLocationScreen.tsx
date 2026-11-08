/**
 * EditWorkLocationScreen
 * Owner-only screen for updating an existing work's location.
 *
 *  - "Current Location" uses device GPS to resolve an address.
 *  - "Choose on Map" opens the SelectLocation map picker.
 *  - The chosen location is persisted via the backend PATCH endpoint and the
 *    work detail query is invalidated so the change shows immediately.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  useIsFocused,
  RouteProp,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { getCurrentLocationInfo } from '../../services/geocodeService';
import {
  applyLocation,
  usePostWorkFormStore,
} from '../../store/usePostWorkFormStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useWork, useUpdateWork } from '../../hooks/useWorks';
import { HomeStackParamList } from '../../types';
import { useHideTabBar } from '../../navigation/useHideTabBar';
import {
  getCurrencySymbolFromCoords,
  getCurrencySymbolFromAddress,
} from '../../utils/currencyUtils';

type EditWorkLocationNavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  'EditWorkLocation'
>;
type EditWorkLocationRouteProp = RouteProp<
  HomeStackParamList,
  'EditWorkLocation'
>;

export function EditWorkLocationScreen(): React.JSX.Element {
  useHideTabBar();
  const navigation = useNavigation<EditWorkLocationNavigationProp>();
  const route = useRoute<EditWorkLocationRouteProp>();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const { user } = useAuthStore();
  const { data: result, isLoading } = useWork(route.params.workId);
  const work = result?.status === 'found' ? result.work : undefined;
  const { mutateAsync: updateWork, isPending: updating } = useUpdateWork();

  const { location } = usePostWorkFormStore();

  const [locating, setLocating] = React.useState(false);

  const isOwner = !!user && !!work && user.id === work.postedBy.id;

  // Store the location value we seeded so we only react to real changes, and
  // only react while the user is actively picking a new location from the map.
  const seededRef = React.useRef<string | undefined>(undefined);
  const pickingRef = React.useRef(false);

  const performUpdate = async (
    newLocation: string,
    latitude?: number,
    longitude?: number,
  ) => {
    let newCurrency: string | undefined;
    if (latitude != null && longitude != null) {
      newCurrency =
        getCurrencySymbolFromCoords(latitude, longitude) || undefined;
    }
    if (!newCurrency && newLocation) {
      newCurrency = getCurrencySymbolFromAddress(newLocation) || undefined;
    }

    try {
      await updateWork({
        workId: route.params.workId,
        data: {
          location: newLocation,
          ...(latitude != null ? { latitude } : {}),
          ...(longitude != null ? { longitude } : {}),
          ...(newCurrency ? { currency: newCurrency } : {}),
        },
      });
      navigation.goBack();
    } catch (err: any) {
      Alert.alert(
        'Update failed',
        err?.message || 'Could not update the location. Please try again.',
      );
    }
  };

  // The previous screen stays mounted while SelectLocation is pushed; when it
  // pops back, the picker store's location will differ from the seed we set.
  React.useEffect(() => {
    if (
      isFocused &&
      pickingRef.current &&
      work &&
      location &&
      location !== seededRef.current
    ) {
      pickingRef.current = false;
      performUpdate(location, work.latitude, work.longitude);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, location, work]);

  const handleUseCurrentLocation = async () => {
    if (!isOwner || !work) return;
    setLocating(true);
    try {
      const info = await getCurrentLocationInfo();
      await performUpdate(info.address, info.latitude, info.longitude);
    } catch (e: any) {
      const message = e?.message || 'Could not get your current location.';
      Alert.alert(
        'Location unavailable',
        `${message}\n\nMake sure location permissions are enabled, or use "Choose on Map" instead.`,
      );
    } finally {
      setLocating(false);
    }
  };

  const handleChooseOnMap = () => {
    if (!isOwner || !work) return;
    const seed = {
      address: work.location,
      latitude: work.latitude,
      longitude: work.longitude,
    };
    seededRef.current = work.location;
    applyLocation(seed);
    pickingRef.current = true;
    navigation.navigate('SelectLocation');
  };
  return (
    <View className="flex-1 bg-white">
      <View style={{ height: insets.top }} />
      {/* Header */}
      <View className="flex-row items-center px-2 pt-1">
        <View className="flex-row items-center px-2 bg-white">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="-mr-4 p-2 -ml-2"
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <MaterialIcons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text className="text-2xl ml-4 font-bold text-gray-900">
            Update Location
          </Text>
        </View>
      </View>

      <View className="px-5 pt-8">
        {isLoading ? (
          <View className="py-8 items-center">
            <ActivityIndicator size="small" color="#059669" />
          </View>
        ) : isOwner && work ? (
          <>
            {/* Current saved location */}
            <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 mb-6">
              <MaterialIcons name="location-on" size={20} color="#6B7280" />
              <Text
                className="ml-2 flex-1 text-sm text-gray-600"
                numberOfLines={2}
              >
                {work.location}
              </Text>
            </View>

            <TouchableOpacity
              className={`flex-row items-center bg-gray-100 rounded-xl px-4 py-4 mb-4 ${
                locating ? 'opacity-50' : ''
              }`}
              activeOpacity={0.7}
              onPress={handleUseCurrentLocation}
              disabled={locating || updating}
            >
              <MaterialIcons name="my-location" size={24} color="#059669" />
              <View className="ml-3 flex-1">
                <Text className="text-base font-semibold text-gray-800">
                  Current Location
                </Text>
                <Text className="text-sm text-gray-500 mt-0.5">
                  {locating
                    ? 'Getting your location…'
                    : 'Use your device GPS to determine location'}
                </Text>
              </View>
              {locating && <ActivityIndicator size="small" color="#059669" />}
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center bg-gray-100 rounded-xl px-4 py-4"
              activeOpacity={0.7}
              onPress={handleChooseOnMap}
              disabled={updating}
            >
              <MaterialIcons name="map" size={24} color="#059669" />
              <View className="ml-3 flex-1">
                <Text className="text-base font-semibold text-gray-800">
                  Choose on Map
                </Text>
                <Text className="text-sm text-gray-500 mt-0.5">
                  Pick a location by searching or dragging the map
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </>
        ) : !isOwner ? (
          <View className="py-8 items-center">
            <Text className="text-base text-gray-500">
              Only the owner of this work can update its location.
            </Text>
          </View>
        ) : (
          <View className="py-8 items-center">
            <Text className="text-base text-gray-500">Work not found</Text>
          </View>
        )}
      </View>
    </View>
  );
}
