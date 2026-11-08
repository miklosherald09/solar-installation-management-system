/**
 * NearMeModal
 * Bottom sheet that lets users pick a location + search radius
 * to filter the home feed by distance.
 *
 *  - Location field shows the currently set address.
 *  - "Locate Me" button uses device GPS via geocodeService.
 *  - "Choose on Map" navigates to the existing SelectLocationScreen.
 *  - Search radius is a 0–50 km slider.
 *  - "Apply" validates, saves state, and closes the modal.
 */

import React, {
  forwardRef,
  useImperativeHandle,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { AppBottomSheetBackdrop } from './AppBottomSheetBackdrop';
import CommunitySlider from '@react-native-community/slider';
import { Slider as MiblanchardSlider } from '@miblanchard/react-native-slider';
import { getCurrentLocationInfo } from '../services/geocodeService';
import { saveNearMePreferences } from '../services/nearMeService';
import { useNearMeStore, applyNearMeLocation } from '../store/useNearMeStore';
import { setAuthUser, useAuthStore } from '../store/useAuthStore';
import { HomeStackParamList } from '../types';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

const MIN_RANGE_KM = 1;
const MAX_RANGE_KM = 100;

const styles = StyleSheet.create({
  slider: { width: '100%', height: 50 },
  container: {
    width: '100%',
  },
});

interface Props {
  onApply: () => void;
}

export interface NearMeModalHandle {
  open: () => void;
  close: () => void;
}

export const NearMeModal = forwardRef<NearMeModalHandle, Props>(
  function NearMeModalComponent({}, ref) {
    const navigation = useNavigation<Nav>();
    const sheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['55%'], []);

    const { location, latitude, longitude, rangeKm, setRangeKm, reset } =
      useNearMeStore();
    const { user } = useAuthStore();

    const [locating, setLocating] = React.useState(false);

    // iOS: the community slider fires onValueChange continuously while
    // dragging, and committing each value to the store triggers a works
    // refetch (rangeKm is part of the useWorks query key). Keep a local draft
    // while dragging and only commit on onSlidingComplete so the backend is
    // hit once per drag instead of dozens of times.
    const [draftRangeKm, setDraftRangeKm] = React.useState(rangeKm);

    React.useEffect(() => {
      setDraftRangeKm(rangeKm);
    }, [rangeKm]);

    // Sheet open / close via ref _______________________________________

    const open = useCallback(() => {
      sheetRef.current?.present();
    }, []);

    const close = useCallback(() => {
      sheetRef.current?.dismiss();
    }, []);

    useImperativeHandle(ref, () => ({ open, close }), [open, close]);

    // Handlers ________________________________________________________

    const handleLocateMe = useCallback(async () => {
      setLocating(true);
      try {
        const info = await getCurrentLocationInfo();
        applyNearMeLocation(info);
      } catch (e: any) {
        const message = e?.message || 'Could not get your current location.';
        Alert.alert(
          'Location unavailable',
          `${message}\n\nMake sure location permissions are enabled, or use "Choose on map" instead.`,
        );
      } finally {
        setLocating(false);
      }
    }, []);

    const handleChooseOnMap = useCallback(() => {
      close();
      setTimeout(() => {
        navigation.navigate('SelectLocation', { mode: 'nearMe' });
      }, 300);
    }, [close, navigation]);

    const handleClear = useCallback(() => {
      reset();
      // Clear the user's saved near-me info in the database as well.
      if (user?.id) {
        saveNearMePreferences(user.id, {
          nearMeLocation: null,
          nearMeConciseLocation: null,
          nearMeLatitude: null,
          nearMeLongitude: null,
          nearMeRangeKm: 5,
        });
      }
    }, [reset, user?.id]);

    const handleRangeChange = useCallback(
      (value: number) => {
        setRangeKm(Math.round(value));
      },
      [setRangeKm],
    );

    const handleSelectSearchRadius = (value: number) => {
      if (!user?.id) return;
      handleRangeChange(value);
      saveNearMePreferences(user?.id, {
        nearMeRangeKm: Math.round(value),
      });
      setAuthUser({
        ...user,
        nearMeRangeKm: Math.round(value),
      });
    };

    // Backdrop ________________________________________________________

    const renderBackdrop = useCallback(
      (props: any) => <AppBottomSheetBackdrop {...props} />,
      [],
    );

    // Derived values __________________________________________________

    const isLocationSet = !!(location && latitude && longitude);

    // Render __________________________________________________________

    return (
      <BottomSheetModal
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
      >
        <BottomSheetView>
          <View className="px-5 pt-2 pb-6">
            {/* ── Header ───────────────────────────────────────── */}
            <View className="flex-row items-center justify-between mb-5">
              <View className="flex-row items-center">
                <MaterialIcons name="near-me" size={22} color="#006742" />
                <Text className="text-lg font-bold text-gray-900 ml-2">
                  Show Works On this Location
                </Text>
              </View>
              {isLocationSet && (
                <TouchableOpacity
                  onPress={handleClear}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text className="text-base text-gray-400">Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ── Location Section ──────────────────────────────── */}
            {/* <Text className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
              Location
            </Text> */}

            <View className="bg-gray-100 rounded-xl px-4 py-3.5 mb-3 flex-row items-center">
              <MaterialIcons
                name={isLocationSet ? 'location-on' : 'location-city'}
                size={20}
                color={isLocationSet ? '#006742' : '#9CA3AF'}
              />
              <Text
                className={`ml-2 flex-1 text-sm ${
                  isLocationSet ? 'text-gray-900 font-medium' : 'text-gray-400'
                }`}
                numberOfLines={2}
              >
                {isLocationSet ? location : 'No location set'}
              </Text>
              {locating && <ActivityIndicator size="small" color="#006742" />}
            </View>

            <View className="flex-row mb-5 gap-3">
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center bg-emerald-50 rounded-xl py-3 border border-emerald-200"
                activeOpacity={0.7}
                onPress={handleLocateMe}
                disabled={locating}
              >
                <MaterialIcons name="my-location" size={18} color="#006742" />
                <Text className="ml-1.5 text-sm font-semibold text-emerald-700">
                  {locating ? 'Locating…' : 'Locate Me'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center bg-white rounded-xl py-3 border border-gray-200"
                activeOpacity={0.7}
                onPress={handleChooseOnMap}
              >
                <MaterialIcons name="map" size={18} color="#374151" />
                <Text className="ml-1.5 text-sm font-semibold text-gray-700">
                  Choose on Map
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── Range Section ─────────────────────────────────── */}
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Search Radius
              </Text>
              <Text className="text-base font-bold text-emerald-700">
                {draftRangeKm} km
              </Text>
            </View>
            <View style={styles.container}>
              {Platform.OS === 'android' ? (
                <MiblanchardSlider
                  value={rangeKm}
                  minimumValue={MIN_RANGE_KM}
                  maximumValue={MAX_RANGE_KM}
                  onSlidingComplete={value =>
                    handleSelectSearchRadius(value[0])
                  }
                  thumbTintColor="#047857"
                  minimumTrackStyle={{ backgroundColor: '#54AF8C' }}
                  maximumTrackStyle={{ backgroundColor: '#54AF8C' }}
                />
              ) : (
                <CommunitySlider
                  style={styles.slider}
                  minimumValue={MIN_RANGE_KM}
                  maximumValue={MAX_RANGE_KM}
                  step={1}
                  value={draftRangeKm}
                  onValueChange={value => setDraftRangeKm(Math.round(value))}
                  onSlidingComplete={handleSelectSearchRadius}
                  minimumTrackTintColor="#006742"
                  maximumTrackTintColor="#D1D5DB"
                  thumbTintColor="#006742"
                  tapToSeek
                />
              )}
            </View>
            <View className="flex-row justify-between mb-6 px-1">
              <Text className="text-xs text-gray-400">{MIN_RANGE_KM} km</Text>
              <Text className="text-xs text-gray-400">{MAX_RANGE_KM} km</Text>
            </View>

            {/* ── Apply Button ──────────────────────────────────── */}
            {/* <TouchableOpacity
              className={`rounded-xl py-3.5 items-center ${
                isLocationSet ? 'bg-[#006742]' : 'bg-gray-300'
              }`}
              activeOpacity={0.8}
              onPress={handleApply}
              disabled={!isLocationSet}
            >
              <Text className="text-base font-bold text-white">
                Apply Filters
              </Text>
            </TouchableOpacity> */}
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);
