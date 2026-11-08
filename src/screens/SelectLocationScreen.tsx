/**
 * SelectLocationScreen
 * Pick a work location on a map.
 *
 *  - Search a place by name; choosing a result flies the map to that spot.
 *  - Drag the map to fine-tune; the PIN is fixed at the center of the map
 *    viewport, so the selected coordinate is always the map's center.
 *  - The address under the pin is reverse-geocoded (debounced) when the
 *    map settles after a pan.
 *  - "Select Location" returns to the PostWork screen with address + coords.
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Keyboard,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MapView, { Region } from 'react-native-maps';
import { applyLocation } from '../store/usePostWorkFormStore';
import {
  applyNearMeLocation,
  activateNearMe,
  useNearMeStore,
} from '../store/useNearMeStore';
import { saveNearMePreferences } from '../services/nearMeService';
import { updateProfile } from '../services/userService';
import { setAuthUser, useAuthStore } from '../store/useAuthStore';

import {
  searchPlaces,
  reverseGeocodeInfo,
  PlaceResult,
} from '../services/geocodeService';
import { HomeStackParamList, LocationInfo } from '../types';
import { useHideTabBar } from '../navigation/useHideTabBar';

type SelectLocationScreenNavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  'SelectLocation'
>;

type SelectLocationScreenRouteProp = RouteProp<
  HomeStackParamList,
  'SelectLocation'
>;

// Metro Manila — used before the user searches / drags anywhere.
const DEFAULT_REGION: Region = {
  latitude: 14.5995,
  longitude: 120.9842,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const PIN_SIZE = 40;

export function SelectLocationScreen(): React.JSX.Element {
  useHideTabBar();
  const navigation = useNavigation<SelectLocationScreenNavigationProp>();
  const route = useRoute<SelectLocationScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const mapRef = React.useRef<MapView | null>(null);

  const { rangeKm, latitude: nearMeLat, longitude: nearMeLng } = useNearMeStore();
  const { user } = useAuthStore();
  const mode = route.params?.mode;

  // When opened from the near-me modal and coordinates are already set,
  // start the map at the user's current near-me location instead of the
  // hardcoded Metro Manila default.
  const initialRegion = React.useMemo<Region>(() => {
    if (mode === 'nearMe' && nearMeLat != null && nearMeLng != null) {
      return {
        latitude: nearMeLat,
        longitude: nearMeLng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    return DEFAULT_REGION;
  }, [mode, nearMeLat, nearMeLng]);

  const [region, setRegion] = React.useState<Region>(initialRegion);
  const [address, setAddress] = React.useState('');
  const [conciseAddress, setConciseAddress] = React.useState('');
  const [resolving, setResolving] = React.useState(false);

  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<PlaceResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [showResults, setShowResults] = React.useState(false);

  // Debounced reverse-geocoding of the map center when it settles.
  const reverseTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const reverseSeq = React.useRef(0);
  const bottomPad = Platform.OS === 'android' ? insets.bottom : 0;

  const resolveAddress = React.useCallback((lat: number, lon: number) => {
    if (reverseTimer.current) {
      clearTimeout(reverseTimer.current);
    }
    reverseTimer.current = setTimeout(async () => {
      const seq = ++reverseSeq.current;
      setResolving(true);
      try {
        const info = await reverseGeocodeInfo(lat, lon);
        if (seq === reverseSeq.current) {
          setAddress(info.address);
          setConciseAddress(info.conciseAddress);
        }
      } catch {
        // keep the previous address on failure
      } finally {
        if (seq === reverseSeq.current) {
          setResolving(false);
        }
      }
    }, 500);
  }, []);

  // Reverse-geocode the initial region on mount.
  React.useEffect(() => {
    resolveAddress(initialRegion.latitude, initialRegion.longitude);
    return () => {
      if (reverseTimer.current) {
        clearTimeout(reverseTimer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolveAddress]);

  const onRegionChangeComplete = React.useCallback(
    (r: Region) => {
      setRegion(r);
      resolveAddress(r.latitude, r.longitude);
    },
    [resolveAddress],
  );

  const runSearch = async () => {
    const q = query.trim();
    if (!q) return;
    Keyboard.dismiss();
    setShowResults(true);
    setSearching(true);
    try {
      setResults(await searchPlaces(q));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const pickResult = (p: PlaceResult) => {
    setShowResults(false);
    Keyboard.dismiss();
    const next: Region = {
      latitude: p.latitude,
      longitude: p.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    setRegion(next);
    setAddress(p.address);
    setConciseAddress('');
    mapRef.current?.animateToRegion(next, 800);
  };

  const handleSelect = () => {
    const info: LocationInfo = {
      address:
        address ||
        `${region.latitude.toFixed(5)}, ${region.longitude.toFixed(5)}`,
      conciseAddress,
      latitude: region.latitude,
      longitude: region.longitude,
    };

    if (mode === 'profile') {
      if (user?.id) {
        const locationData = {
          location: info.address,
          conciseLocation: info.conciseAddress ?? '',
          latitude: info.latitude,
          longitude: info.longitude,
        };
        updateProfile(user.id, locationData);
        setAuthUser({ ...user, ...locationData });
      }
    } else {
      applyLocation(info);
      applyNearMeLocation(info);

      // Opened from the near-me "Choose on Map" action — persist the selection
      // to the backend and activate the home feed filter so works refetch with
      // the updated location.
      if (mode === 'nearMe') {
        activateNearMe();
        if (user?.id) {
          const prefs = {
            nearMeLocation: info.address,
            nearMeConciseLocation: info.conciseAddress ?? '',
            nearMeLatitude: info.latitude,
            nearMeLongitude: info.longitude,
            nearMeRangeKm: rangeKm,
          };
          saveNearMePreferences(user.id, prefs);
          setAuthUser({ ...user, ...prefs });
        }
      }
    }

    navigation.goBack();
  };

  return (
    <View
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      className="bg-gray-50"
    >
      {/* Safe area top spacer */}
      <View style={{ height: insets.top }} className="bg-white" />
      {/* Header + search */}
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
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-xl px-3 py-0">
            {/* <MaterialIcons name="search" size={20} color="#9CA3AF" /> */}
            <TextInput
              className="flex-1 py-3.5 px-4 font-normal text-base text-gray-900"
              style={
                Platform.OS === 'android' ? { padding: 0 } : { lineHeight: 0 }
              }
              value={query}
              onChangeText={setQuery}
              placeholder="Search a place or address"
              placeholderTextColor="#9CA3AF"
              returnKeyType="search"
              onSubmitEditing={runSearch}
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setQuery('');
                  setResults([]);
                }}
                accessibilityLabel="Clear search"
                accessibilityRole="button"
              >
                <MaterialIcons name="close" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={runSearch}
            className="ml-2 px-2 py-2"
            accessibilityLabel="Search"
            accessibilityRole="button"
          >
            <Text className="text-emerald-600 font-semibold">Search</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Map */}
      <View className="flex-1">
        <MapView
          ref={mapRef}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          initialRegion={initialRegion}
          onRegionChangeComplete={onRegionChangeComplete}
          showsUserLocation={false}
        />

        {/* Centered pin — fixed at the center of the map viewport. The
            selected coordinate is always the map's center (region center). */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: [
              { translateX: -PIN_SIZE / 2 },
              { translateY: -PIN_SIZE },
            ],
          }}
        >
          <MaterialIcons name="location-on" size={PIN_SIZE} color="#dc2626" />
        </View>

        {/* Address chip */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}
        >
          <View className="bg-white rounded-xl px-4 py-3 shadow-sm">
            {resolving ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color="#059669" />
                <Text className="ml-2 text-sm text-gray-500">
                  Finding address…
                </Text>
              </View>
            ) : (
              <Text className="text-sm text-gray-800" numberOfLines={2}>
                {address || 'Drag the map to pick a location'}
              </Text>
            )}
          </View>
        </View>

        {/* Search results dropdown */}
        {showResults && (
          <Pressable
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            className="bg-black/20"
            onPress={() => setShowResults(false)}
          >
            <View
              className="bg-white m-3 rounded-xl"
              style={{ maxHeight: 320 }}
            >
              {searching ? (
                <View className="py-6 items-center">
                  <ActivityIndicator size="small" color="#059669" />
                </View>
              ) : results.length === 0 ? (
                <View className="py-6 items-center">
                  <Text className="text-sm text-gray-500">No places found</Text>
                </View>
              ) : (
                <FlatList
                  data={results}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      className="px-4 py-3 border-b border-gray-100"
                      onPress={() => pickResult(item)}
                    >
                      <Text
                        className="text-sm font-medium text-gray-900"
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                      <Text className="text-xs text-gray-500" numberOfLines={1}>
                        {item.address}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          </Pressable>
        )}
      </View>

      {/* Bottom: Select Location */}
      <View
        className="bg-white border-t border-gray-200 px-5 py-4"
        style={{ paddingBottom: bottomPad + 16 }}
      >
        <TouchableOpacity
          className="rounded-xl py-4 items-center bg-emerald-600"
          activeOpacity={0.8}
          onPress={handleSelect}
        >
          <Text className="text-base font-bold text-white">
            Select Location
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
