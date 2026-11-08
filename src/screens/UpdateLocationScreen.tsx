import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { getCurrentLocationInfo } from '../services/geocodeService';
import {
  applyLocation,
  usePostWorkFormStore,
} from '../store/usePostWorkFormStore';
import { HomeStackParamList } from '../types';
import { useHideTabBar } from '../navigation/useHideTabBar';

type UpdateLocationScreenNavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  'UpdateLocation'
>;

export function UpdateLocationScreen(): React.JSX.Element {
  useHideTabBar();
  const navigation = useNavigation<UpdateLocationScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { location } = usePostWorkFormStore();

  const [locating, setLocating] = React.useState(false);

  // Remember the location value when this screen mounts so we can detect
  // when it changes (i.e. user picked a location from the map).
  const initialLocationRef = React.useRef(location);

  // When the screen regains focus and the location has changed (updated from
  // SelectLocationScreen), navigate back to PostWorkScreen automatically.
  React.useEffect(() => {
    if (isFocused && location && location !== initialLocationRef.current) {
      navigation.goBack();
    }
  }, [isFocused, location, navigation]);

  const handleUseCurrentLocation = async () => {
    setLocating(true);
    try {
      const info = await getCurrentLocationInfo();
      applyLocation(info);
      navigation.goBack();
    } catch (e: any) {
      const message = e?.message || 'Could not get your current location.';
      Alert.alert(
        'Location unavailable',
        `${message}\n\nMake sure location permissions are enabled, or use "Choose on map" instead.`,
      );
    } finally {
      setLocating(false);
    }
  };

  const handleChooseOnMap = () => {
    navigation.navigate('SelectLocation');
  };

  return (
    <View className="flex-1 bg-white">
      <View style={{ height: insets.top }} />
      {/* Header */}
      <View className="flex-row items-center px-2 pt-0 pb-0">
        <View className="flex-row items-center px-2 py-0 bg-white">
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

      {/* Location options */}
      <View className="px-5 pt-8">
        <Text className="text-4xl font-semibold text-gray-800 mb-6">
          Where?
        </Text>

        <TouchableOpacity
          className={`flex-row items-center bg-gray-100 rounded-xl px-4 py-4 mb-4 ${
            locating ? 'opacity-50' : ''
          }`}
          activeOpacity={0.7}
          onPress={handleUseCurrentLocation}
          disabled={locating}
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
      </View>
    </View>
  );
}
