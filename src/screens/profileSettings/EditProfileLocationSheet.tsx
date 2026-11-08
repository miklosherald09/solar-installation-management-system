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
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { AppBottomSheetBackdrop } from '../../components';
import { getCurrentLocationInfo } from '../../services/geocodeService';
import { updateProfile } from '../../services/userService';
import { useAuthStore, setAuthUser } from '../../store/useAuthStore';

export interface EditProfileLocationSheetHandle {
  open: () => void;
  close: () => void;
}

export const EditProfileLocationSheet =
  forwardRef<EditProfileLocationSheetHandle>(
    function EditProfileLocationSheetComponent(_, ref) {
      const navigation = useNavigation<any>();
      const insets = useSafeAreaInsets();
      const bottomPad = Platform.OS === 'android' ? insets.bottom : 0;
      const sheetRef = useRef<BottomSheetModal>(null);
      const snapPoints = useMemo(() => ['35%'], []);

      const { user } = useAuthStore();
      const [locating, setLocating] = React.useState(false);

      const open = useCallback(() => {
        sheetRef.current?.present();
      }, []);

      const close = useCallback(() => {
        sheetRef.current?.dismiss();
      }, []);

      useImperativeHandle(ref, () => ({ open, close }), [open, close]);

      const handleLocateMe = useCallback(async () => {
        setLocating(true);
        try {
          const info = await getCurrentLocationInfo();
          if (user?.id) {
            const locationData = {
              location: info.address,
              conciseLocation: info.conciseAddress ?? '',
              latitude: info.latitude,
              longitude: info.longitude,
            };
            await updateProfile(user.id, locationData);
            setAuthUser({ ...user, ...locationData });
          }
          close();
        } catch (e: any) {
          const message = e?.message || 'Could not get your current location.';
          Alert.alert(
            'Location unavailable',
            `${message}\n\nMake sure location permissions are enabled, or use "Choose on map" instead.`,
          );
        } finally {
          setLocating(false);
        }
      }, [user, close]);

      const handleChooseOnMap = useCallback(() => {
        close();
        setTimeout(() => {
          navigation.navigate('SelectLocation', { mode: 'profile' });
        }, 300);
      }, [close, navigation]);

      const renderBackdrop = useCallback(
        (props: any) => <AppBottomSheetBackdrop {...props} />,
        [],
      );

      return (
        <BottomSheetModal
          ref={sheetRef}
          index={0}
          snapPoints={snapPoints}
          backdropComponent={renderBackdrop}
          enablePanDownToClose
        >
          <BottomSheetView>
            <View
              style={{ paddingBottom: Math.max(bottomPad, 24) }}
              className="px-5 pt-2"
            >
              {/* Header */}
              <View className="flex-row items-center justify-between mb-5">
                <View className="flex-row items-center">
                  <MaterialIcons name="place" size={22} color="#059669" />
                  <Text className="text-lg font-bold text-gray-900 ml-2">
                    Update Location
                  </Text>
                </View>
              </View>

              {/* Current Location option */}
              <TouchableOpacity
                className={`flex-row items-center bg-gray-100 rounded-xl px-4 py-4 mb-4 ${
                  locating ? 'opacity-50' : ''
                }`}
                activeOpacity={0.7}
                onPress={handleLocateMe}
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

              {/* Choose on Map option */}
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
          </BottomSheetView>
        </BottomSheetModal>
      );
    },
  );
