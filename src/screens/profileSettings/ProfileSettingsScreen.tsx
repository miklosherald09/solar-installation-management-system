/**
 * ProfileSettingsScreen
 * User profile and settings — orchestrates sub-components.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetTextInput,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import {
  AppBottomSheetBackdrop,
  CountryCodePicker,
  VerifiedBadge,
} from '../../components';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';
import { DEFAULT_COUNTRY, PH_ISO, getCountryByIso } from '../../data/countries';
import { launchImageLibrary } from 'react-native-image-picker';
import { useAuthStore, signOut, setAuthUser } from '../../store/useAuthStore';
import {
  getAppVersionString,
  getBuildEnvironmentLabel,
} from '../../constants/version';
import { useWorks } from '../../hooks/useWorks';
import { useToggleProBadgeMutation } from '../../hooks/useUsers';
import { ProfileStackParamList, Work } from '../../types';
import { uploadProfilePicture } from '../../services/minioService';
import { updateProfile } from '../../services/userService';

import { ProfileHeader } from './ProfileHeader';
import { ProfileCard } from './ProfileCard';
import { ContactInfoSection } from './ContactInfoSection';
import { ProfileMenuItems, MenuItem } from './ProfileMenuItems';
import { UnauthenticatedProfile } from './UnauthenticatedProfile';
import { LocationInfoSection } from './LocationInfoSection';
import {
  EditProfileLocationSheet,
  EditProfileLocationSheetHandle,
} from './EditProfileLocationSheet';
import { CapableWorkTypesModal } from '../../components/CapableWorkTypesModal';

type ProfileSettingsScreenNavigationProp = NativeStackNavigationProp<
  ProfileStackParamList,
  'ProfileSettings'
>;

export function ProfileSettingsScreen(): React.JSX.Element {
  const navigation = useNavigation<ProfileSettingsScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'android' ? insets.bottom : 0;
  const { data: works } = useWorks();
  const { isAuthenticated, user } = useAuthStore();

  const nameSheetRef = React.useRef<BottomSheetModal>(null);
  const phoneSheetRef = React.useRef<BottomSheetModal>(null);
  const locationSheetRef = React.useRef<EditProfileLocationSheetHandle>(null);

  const [draftName, setDraftName] = React.useState('');
  const [draftPhone, setDraftPhone] = React.useState('');
  const [draftCountryIso, setDraftCountryIso] = React.useState(PH_ISO);
  const [phoneTouched, setPhoneTouched] = React.useState(false);
  const [countryPickerVisible, setCountryPickerVisible] = React.useState(false);

  // Capable work types edit modal
  const [showCapableModal, setShowCapableModal] = React.useState(false);

  const [savingName, setSavingName] = React.useState(false);
  const [savingPhone, setSavingPhone] = React.useState(false);

  const country = getCountryByIso(draftCountryIso) ?? DEFAULT_COUNTRY;

  const parsedPhone = React.useMemo(() => {
    return draftPhone.trim()
      ? parsePhoneNumberFromString(
          draftPhone.trim(),
          country.iso as CountryCode,
        )
      : undefined;
  }, [draftPhone, country]);

  const phoneValid = !draftPhone.trim() || (parsedPhone?.isValid() ?? false);
  const showPhoneError = phoneTouched && !phoneValid;
  const editPhoneSnapPoints = useMemo(
    () => (Platform.OS === 'ios' ? ['24%'] : ['25%']),
    [],
  );

  const userId = user?.id ?? '';

  const myPostedWorks = React.useMemo(
    () =>
      works && userId
        ? (works as Work[]).filter(w => w.postedBy.id === userId)
        : [],
    [works, userId],
  );

  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
  const proBadgeMutation = useToggleProBadgeMutation(user?.id ?? '');
  const isUserPro = Boolean(user?.verifiedAt);

  const handleToggleOwnProBadge = () => {
    if (!user?.id) return;
    if (isUserPro) {
      Alert.alert(
        'Remove Pro Badge?',
        'This will remove your "Verified Pro" badge status.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () =>
              proBadgeMutation.mutate(undefined, {
                onSuccess: () => {
                  Alert.alert(
                    'Pro Badge Removed',
                    'Your Verified Pro status has been removed.',
                  );
                },
                onError: (err: any) => {
                  Alert.alert(
                    'Error',
                    err?.message || 'Failed to remove Pro Badge.',
                  );
                },
              }),
          },
        ],
      );
      return;
    }

    proBadgeMutation.mutate(undefined, {
      onSuccess: () => {
        Alert.alert('Pro Badge Applied', 'You are now a Verified Pro!');
      },
      onError: (err: any) => {
        Alert.alert('Error', err?.message || 'Failed to apply Pro Badge.');
      },
    });
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          navigation.reset({
            index: 0,
            routes: [{ name: 'UserProfile' }],
          });
          (navigation as any).navigate('HomeTab', { screen: 'Home' });
        },
      },
    ]);
  };

  const handleEditName = () => {
    setDraftName(user?.name ?? '');
    nameSheetRef.current?.present();
  };

  const handleEditPhone = () => {
    setDraftPhone(user?.phone ?? '');
    setDraftCountryIso(user?.phoneCountryCode ?? PH_ISO);
    setPhoneTouched(false);
    phoneSheetRef.current?.present();
  };

  const handleEditLocation = () => {
    locationSheetRef.current?.open();
  };

  const handleSaveName = async () => {
    const trimmed = draftName.trim();
    if (trimmed.length < 2) {
      Alert.alert('Invalid Name', 'Name must be at least 2 characters.');
      return;
    }
    setSavingName(true);
    try {
      if (user?.id) {
        await updateProfile(user.id, { name: trimmed });
        setAuthUser({ ...user, name: trimmed });
      }
      nameSheetRef.current?.dismiss();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update name.');
    } finally {
      setSavingName(false);
    }
  };

  const handleSavePhone = async () => {
    if (!phoneValid) {
      setPhoneTouched(true);
      return;
    }
    setSavingPhone(true);
    try {
      if (user?.id) {
        const nationalNumber = parsedPhone ? parsedPhone.nationalNumber : '';
        const countryCode = parsedPhone ? parsedPhone.country : null;

        await updateProfile(user.id, {
          phone: nationalNumber || null,
          phoneCountryCode: countryCode || null,
        });
        setAuthUser({
          ...user,
          phone: nationalNumber || null,
          phoneCountryCode: countryCode || null,
        });
      }
      phoneSheetRef.current?.dismiss();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update phone.');
    } finally {
      setSavingPhone(false);
    }
  };

  const handleEditPhoto = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.8,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }

      const uri = result.assets[0].uri;
      if (!uri || !user) return;

      const upload = await uploadProfilePicture(uri, user.id);
      await updateProfile(user.id, { photo: upload.url });

      setAuthUser({
        ...user,
        photo: upload.url,
      });
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update photo.');
    }
  };

  const renderBackdrop = React.useCallback(
    (props: any) => <AppBottomSheetBackdrop {...props} />,
    [],
  );

  if (!isAuthenticated) {
    return <UnauthenticatedProfile />;
  }

  const menuItems: MenuItem[] = [
    {
      icon: 'assignment',
      label: 'My Posted Works',
      subtitle: `${myPostedWorks.length} works`,
      onPress: () => navigation.navigate('AddedWork'),
    },
    {
      icon: 'notifications',
      label: 'Notifications',
      subtitle: 'Notification settings',
      onPress: () => navigation.navigate('NotificationSettings'),
    },
    {
      icon: 'shield',
      label: 'Privacy & Security',
      subtitle: 'Account security',
      onPress: () => navigation.navigate('AccountSecurity'),
    },
    {
      icon: 'help',
      label: 'Help & Support',
      subtitle: 'Get help',
      onPress: () => navigation.navigate('HelpSupport'),
    },
    {
      icon: 'handyman',
      label: 'My Skills',
      subtitle: user?.capableWorkTypes?.length
        ? `${user.capableWorkTypes.length} work type${
            user.capableWorkTypes.length > 1 ? 's' : ''
          } selected`
        : 'Set your capable work types',
      onPress: () => setShowCapableModal(true),
    },
  ];

  return (
    <View className="flex-1 bg-white">
      <ProfileHeader onBackPress={() => navigation.goBack()} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <ProfileCard
          photo={user?.photo}
          name={user?.name ?? ''}
          email={user?.email ?? ''}
          memberSince={
            user?.verifiedAt ? new Date(user.verifiedAt) : new Date()
          }
          onEditName={handleEditName}
          onEditPhoto={handleEditPhoto}
        />

        <ContactInfoSection
          email={user?.email ?? ''}
          phone={user?.phone}
          phoneCountryCode={user?.phoneCountryCode}
          onEditPhone={handleEditPhone}
        />
        <LocationInfoSection onEditLocation={handleEditLocation} />

        {/* Admin Pro Badge Section */}
        {isAdmin && (
          <View className="mx-5 mt-4 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <MaterialIcons name="verified" size={20} color="#059669" />
                <Text className="text-base font-bold text-gray-900 ml-2">
                  Pro Badge (Admin)
                </Text>
              </View>
              <View>
                {isUserPro ? (
                  <VerifiedBadge showLabel />
                ) : (
                  <Text className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                    Regular Member
                  </Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              onPress={handleToggleOwnProBadge}
              disabled={proBadgeMutation.isPending}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={
                isUserPro ? 'Remove Pro Badge' : 'Apply Pro Badge'
              }
              className={`flex-row mt-2 items-center justify-center rounded-xl border py-3 mt-3.5 ${
                isUserPro
                  ? 'border-red-300 bg-red-50'
                  : 'border-emerald-600 bg-emerald-600'
              }`}
            >
              {proBadgeMutation.isPending ? (
                <ActivityIndicator
                  size="small"
                  color={isUserPro ? '#DC2626' : '#FFFFFF'}
                />
              ) : (
                <>
                  <MaterialIcons
                    name={isUserPro ? 'remove-circle-outline' : 'verified'}
                    size={18}
                    color={isUserPro ? '#DC2626' : '#FFFFFF'}
                  />
                  <Text
                    className={`ml-2 text-sm font-semibold ${
                      isUserPro ? 'text-red-700' : 'text-white'
                    }`}
                  >
                    {isUserPro ? 'Remove Pro Badge' : 'Apply Pro Badge'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <ProfileMenuItems items={menuItems} />

        <TouchableOpacity
          className="mx-5 mt-6 bg-red-50 rounded-xl py-3.5 items-center border border-red-200"
          onPress={handleLogout}
        >
          <Text className="text-base font-semibold text-red-600">Log Out</Text>
        </TouchableOpacity>

        <Text className="text-center text-xs text-gray-400 mt-6">
          {getAppVersionString()}
        </Text>
        <Text className="text-center text-xs text-gray-400 mt-1 mb-16">
          {getBuildEnvironmentLabel()}
        </Text>
      </ScrollView>

      {/* Capable Work Types Edit Modal */}
      <CapableWorkTypesModal
        visible={showCapableModal}
        onClose={() => setShowCapableModal(false)}
        editMode
      />

      {/* Edit Name Bottom Sheet */}
      <BottomSheetModal
        ref={nameSheetRef}
        index={0}
        snapPoints={Platform.OS === 'ios' ? ['20%'] : ['20%']}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        keyboardBehavior={
          bottomPad || Platform.OS === 'ios' ? 'interactive' : 'extend'
        }
        keyboardBlurBehavior={Platform.OS === 'ios' ? 'none' : 'restore'}
        android_keyboardInputMode="adjustPan"
      >
        <BottomSheetView
          style={{ paddingBottom: insets.bottom }}
          className="px-5 pt-2"
        >
          <Text className="text-lg font-bold text-gray-900">Edit Name</Text>
          <View className="bg-gray-100 rounded-xl px-4 py-1 mb-4">
            <BottomSheetTextInput
              className="py-3 text-base text-gray-900"
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Your name"
              placeholderTextColor="#9CA3AF"
              maxLength={100}
              autoFocus
            />
          </View>
          <TouchableOpacity
            className="bg-emerald-600 rounded-xl py-3.5 items-center"
            activeOpacity={0.8}
            onPress={handleSaveName}
            disabled={savingName}
          >
            {savingName ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-base font-bold text-white">Save Name</Text>
            )}
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>

      {/* Edit Phone Bottom Sheet */}
      <BottomSheetModal
        ref={phoneSheetRef}
        index={0}
        snapPoints={editPhoneSnapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        keyboardBlurBehavior={Platform.OS === 'ios' ? 'none' : 'restore'}
        keyboardBehavior={
          bottomPad || Platform.OS === 'ios' ? 'interactive' : 'extend'
        }
        android_keyboardInputMode="adjustPan"
      >
        <BottomSheetView
          style={{ paddingBottom: insets.bottom + 16 }}
          className="px-5 pt-2"
        >
          <Text className="text-lg font-bold text-gray-900 mb-4">
            Edit Phone Number
          </Text>
          <BottomSheetScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingBottom: 8 }}
          >
            <View
              className={`flex-row items-center bg-white border rounded-xl overflow-hidden mb-6 ${
                showPhoneError ? 'border-red-400' : 'border-gray-200'
              }`}
            >
              <TouchableOpacity
                className="flex-row items-center pl-4 pr-2 border-r border-gray-200 h-12"
                activeOpacity={0.7}
                onPress={() => setCountryPickerVisible(true)}
                accessibilityLabel="Select country code"
              >
                <Text className="text-lg mr-1">{country.flagEmoji}</Text>
                <Text className="text-base font-semibold text-gray-500">
                  +{country.dialCode}
                </Text>
                <MaterialIcons
                  name="keyboard-arrow-down"
                  size={18}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
              <BottomSheetTextInput
                className="flex-1 py-3 pr-4 pl-3 text-base text-gray-900"
                style={
                  Platform.OS === 'android' ? { padding: 0 } : { lineHeight: 0 }
                }
                value={draftPhone}
                onChangeText={setDraftPhone}
                onBlur={() => setPhoneTouched(true)}
                placeholder={country.placeholder || ''}
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                maxLength={country.nationalLength + 5}
                autoFocus
              />
              {draftPhone?.length > 0 ? (
                <TouchableOpacity
                  className="pr-3 py-3"
                  activeOpacity={0.7}
                  onPress={() => setDraftPhone('')}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <MaterialIcons name="close" size={16} color="#CACAD9" />
                </TouchableOpacity>
              ) : null}
            </View>

            {showPhoneError && (
              <Text className="text-xs text-red-500 -mt-4 mb-4 ml-1">
                Enter a valid {country.name} mobile number
              </Text>
            )}

            <TouchableOpacity
              className="bg-emerald-600 rounded-xl py-3.5 items-center"
              activeOpacity={0.8}
              onPress={handleSavePhone}
              disabled={savingPhone}
            >
              {savingPhone ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-base font-bold text-white">
                  Save Phone Number
                </Text>
              )}
            </TouchableOpacity>
          </BottomSheetScrollView>
        </BottomSheetView>
      </BottomSheetModal>

      <CountryCodePicker
        visible={countryPickerVisible}
        selectedIso={draftCountryIso}
        onSelect={c => {
          setDraftCountryIso(c.iso);
          setCountryPickerVisible(false);
        }}
        onClose={() => setCountryPickerVisible(false)}
      />

      <EditProfileLocationSheet ref={locationSheetRef} />
    </View>
  );
}
