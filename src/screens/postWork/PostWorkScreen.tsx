/**
 * PostWorkScreen
 * Thin composer — assembles the atomic PostWork form fields and
 * bottom sheets. Holds submission logic and form-store wiring.
 */

import React, { useCallback, useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Keyboard,
  PermissionsAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { AppBottomSheetBackdrop } from '../../components';
import {
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useCreateWork, useWorkTypes, useWorkCurrency } from '../../hooks';
import {
  applyLocation,
  usePostWorkFormStore,
} from '../../store/usePostWorkFormStore';
import { useAuthStore, setAuthUser } from '../../store/useAuthStore';
import {
  getCurrentCountryIso,
  getCurrentLocationInfo,
  reverseGeocodeCountry,
} from '../../services/geocodeService';
import { DEFAULT_COUNTRY, PH_ISO, getCountryByIso } from '../../data/countries';
import { requestPushNotif } from '../../services/pushNotificationService';
import { updateProfile } from '../../services/userService';
import { uploadImages } from '../../services/minioService';
import { WorkDurationUnit, WorkCategory } from '../../types';
import { PostWorkNav } from './types';
import { formatMoney } from './helpers';
import { LocationField } from './LocationField';
import { ImageUploadField } from './ImageUploadField';
import { MobileNumberField } from './MobileNumberField';
import { WorkTypeField } from './WorkTypeField';
import { DescriptionField } from './DescriptionField';
import { BudgetField } from './BudgetField';
import { OtherDetailsSection } from './OtherDetailsSection';
import { BudgetPickerSheet } from './BudgetPickerSheet';
import { CustomBudgetSheet } from './CustomBudgetSheet';
import { WorkDurationSheet } from './WorkDurationSheet';
import { WorkPostedModal } from './WorkPostedModal';
import { useHideTabBar } from '../../navigation/useHideTabBar';
import { UploadButton } from './UploadButton';
import { CameraButton } from './CameraButton';

export function PostWorkScreen(): React.JSX.Element {
  useHideTabBar();
  const navigation = useNavigation<PostWorkNav>();
  const insets = useSafeAreaInsets();
  const { mutateAsync: createWork } = useCreateWork();
  const { data: workTypes } = useWorkTypes();
  const { user } = useAuthStore();
  const bottomPad = Platform.OS === 'android' ? insets.bottom : 0;

  const [isKeyboardActive, setIsKeyboardActive] = React.useState(false);

  React.useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, () => {
      setIsKeyboardActive(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardActive(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Form state persisted in module-level store
  const {
    mobileNumber,
    setMobileNumber,
    countryIso,
    setCountryIso,
    description,
    setDescription,
    category,
    categories,
    budget,
    setBudget,
    budgetType,
    setBudgetType,
    location,
    latitude,
    longitude,
    images,
    setImages,
    scheduledDate,
    setScheduledDate,
    tags,
    setTags,
    durationValue,
    durationUnit,
    setDurationValue,
    setDurationUnit,
    reset: resetForm,
  } = usePostWorkFormStore();

  const currencySymbol = useWorkCurrency({ location, latitude, longitude });

  const [mobileRaw, setMobileRaw] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [showPostedModal, setShowPostedModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isPickingMedia, setIsPickingMedia] = useState(false);

  // Bottom sheet refs and draft state
  const budgetSheetRef = useRef<BottomSheetModal>(null);
  const customBudgetSheetRef = useRef<BottomSheetModal>(null);
  const durationSheetRef = useRef<BottomSheetModal>(null);
  const mobileNumberRef = useRef<TextInput>(null);
  const descriptionRef = useRef<TextInput>(null);

  const [selectedBudget, setSelectedBudget] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [customAmountRaw, setCustomAmountRaw] = useState('');
  const [durationValueDraft, setDurationValueDraft] = useState('');
  const [durationUnitDraft, setDurationUnitDraft] =
    useState<WorkDurationUnit>('days');

  const requestAndroidCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );
      if (granted) return true;

      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message:
            'Solar Installation Management System needs camera access so you can take photos or videos.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Failed to request android camera permission:', err);
      return false;
    }
  };

  const handleCameraCapture = async () => {
    if (!user) {
      Alert.alert(
        'Sign in required',
        'Please sign in to capture and upload photos or videos.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign In',
            onPress: () => navigation.navigate('Login' as any),
          },
        ],
      );
      return;
    }

    try {
      const hasPermission = await requestAndroidCameraPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Camera access is needed to capture photos or videos. Please enable it in Settings.',
        );
        return;
      }

      const result = await launchCamera({
        mediaType: 'mixed',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
        videoQuality: 'high',
        durationLimit: 60,
        saveToPhotos: false,
        cameraType: 'back',
        presentationStyle: 'fullScreen',
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }

      if (result.errorCode) {
        if (result.errorCode === 'permission') {
          Alert.alert(
            'Camera Permission Required',
            'Please enable camera access in your device Settings to take photos or videos.',
          );
          return;
        }
        if (result.errorCode === 'camera_unavailable') {
          Alert.alert(
            'Camera Unavailable',
            'The camera is not available on this device.',
          );
          return;
        }
        Alert.alert(
          'Camera Error',
          result.errorMessage || 'Failed to capture from camera.',
        );
        return;
      }

      const assets = result.assets.filter(a => a.uri);
      if (assets.length === 0) return;

      setIsCapturing(true);
      const tempWorkId = `temp-${Date.now()}`;
      const uploadResults = await uploadImages(assets, user.id, tempWorkId);
      const newKeys = uploadResults.map(r => r.key);
      setImages([...images, ...newKeys]);
    } catch (err: any) {
      Alert.alert(
        'Upload Failed',
        err?.message || 'Could not upload captured media.',
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const handlePickMedia = async () => {
    if (!user) {
      Alert.alert(
        'Sign in required',
        'Please sign in to select and upload photos or videos.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign In',
            onPress: () => navigation.navigate('Login' as any),
          },
        ],
      );
      return;
    }

    try {
      const result = await launchImageLibrary({
        mediaType: 'mixed',
        selectionLimit: 10,
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
        videoQuality: 'high',
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }

      if (result.errorCode) {
        if (result.errorCode === 'permission') {
          Alert.alert(
            'Photo Library Permission Required',
            'Please enable photo library access in your device Settings to select photos or videos.',
          );
          return;
        }
        Alert.alert(
          'Picker Error',
          result.errorMessage || 'Failed to select media from gallery.',
        );
        return;
      }

      const assets = result.assets.filter(a => a.uri);
      if (assets.length === 0) return;

      setIsPickingMedia(true);
      const tempWorkId = `temp-${Date.now()}`;
      const uploadResults = await uploadImages(assets, user.id, tempWorkId);
      const newKeys = uploadResults.map(r => r.key);
      setImages([...images, ...newKeys]);
    } catch (err: any) {
      Alert.alert(
        'Upload Failed',
        err?.message || 'Could not upload selected media.',
      );
    } finally {
      setIsPickingMedia(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const hasBottomPad = bottomPad > 10;
  // Snap points for bottom sheets
  const budgetSnapPoints = useMemo(
    () => [Platform.OS === 'ios' ? '70%' : hasBottomPad ? '70%' : '70%'],
    [hasBottomPad],
  );
  const customBudgetSnapPoints = useMemo(
    () => [Platform.OS === 'ios' ? '10%' : hasBottomPad ? '70%' : '50%'],
    [hasBottomPad],
  );
  const durationSnapPoints = useMemo(
    () => [Platform.OS === 'ios' ? '42%' : hasBottomPad ? '85%' : '75%'],
    [hasBottomPad],
  );

  const renderBackdrop = useCallback(
    (props: any) => <AppBottomSheetBackdrop {...props} />,
    [],
  );

  // Init mobileRaw from persisted mobileNumber on mount and resolve the user's
  // default country from their GPS location (falling back to the Philippines).
  const resolvedCountryRef = useRef(false);
  const silentLocRef = useRef(false);
  const defaultedLocationRef = useRef(false);
  React.useEffect(() => {
    if (!mobileNumber && user?.phone) {
      setMobileRaw(user.phone);
      setMobileNumber(user.phone);
    } else if (mobileNumber) {
      setMobileRaw(mobileNumber);
    }

    const initialCountry = countryIso || user?.phoneCountryCode;
    if (initialCountry) {
      setCountryIso(initialCountry);
    } else if (!resolvedCountryRef.current) {
      resolvedCountryRef.current = true;
      getCurrentCountryIso()
        .then(iso => {
          // Only adopt the detected country if we still have no selection.
          setCountryIso(getCountryByIso(iso) ? iso : PH_ISO);
        })
        .catch(() => setCountryIso(PH_ISO));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefill the location field with the user's saved location (synced to the
  // database) whenever the form has no location yet. Re-runs on dependency
  // changes so we seed correctly if the near-me DB fetch resolves after this
  // screen mounts.
  React.useEffect(() => {
    if (defaultedLocationRef.current || location) {
      defaultedLocationRef.current = true;
      return;
    }
    if (!user) {
      return;
    }
    if (user.location) {
      defaultedLocationRef.current = true;
      applyLocation({
        address: user.location,
        latitude: user.latitude ?? undefined,
        longitude: user.longitude ?? undefined,
      });
    } else {
      // User has no saved location in the database! Get silently, save to DB, and set as default.
      if (user.id && !silentLocRef.current) {
        silentLocRef.current = true;
        getCurrentLocationInfo()
          .then(async loc => {
            defaultedLocationRef.current = true;
            // 1. Save to database
            const locationData = {
              location: loc.address,
              conciseLocation: loc.conciseAddress,
              latitude: loc.latitude,
              longitude: loc.longitude,
            };
            try {
              await updateProfile(user.id, locationData);
            } catch (dbErr) {
              console.warn(
                '[PostWork] Failed to save silent location to DB:',
                dbErr,
              );
            }

            // 2. Update AuthStore
            setAuthUser({
              ...user,
              ...locationData,
            });

            // 3. Apply to form field
            applyLocation({
              address: loc.address,
              latitude: loc.latitude,
              longitude: loc.longitude,
            });
          })
          .catch(err => {
            console.warn(
              '[PostWork] Failed to silently get user location:',
              err,
            );
          });
      }
    }
  }, [location, user]);

  // Whenever the form location coordinates change, update the mobile number country code to match.
  React.useEffect(() => {
    if (latitude != null && longitude != null) {
      reverseGeocodeCountry(latitude, longitude)
        .then(iso => {
          setCountryIso(getCountryByIso(iso) ? iso : PH_ISO);
        })
        .catch(() => {
          // keep previous country Iso if reverse geocode fails
        });
    }
  }, [latitude, longitude, setCountryIso]);

  // The country context for the mobile number (dial code + formatting).
  const country = getCountryByIso(countryIso) ?? DEFAULT_COUNTRY;

  const parsedPhone = mobileRaw.trim()
    ? parsePhoneNumberFromString(mobileRaw.trim(), country.iso as CountryCode)
    : undefined;
  const phoneValid = !mobileRaw.trim() || (parsedPhone?.isValid() ?? false);
  const showPhoneError = phoneTouched && !phoneValid;

  const handleMobileChange = (text: string) => {
    setMobileRaw(text);
    setMobileNumber(text);
  };

  // Persist the typed mobile number to the signed-in user's profile.
  const handleSaveMobileNumber = async () => {
    if (!user || !parsedPhone) {
      return;
    }
    try {
      await updateProfile(user.id, {
        phone: parsedPhone.nationalNumber,
        phoneCountryCode: parsedPhone.country,
      });
      setAuthUser({
        ...user,
        phone: parsedPhone.nationalNumber,
        phoneCountryCode: parsedPhone.country,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.warn('[PostWork] save mobile number error:', message);
      Alert.alert(
        'Error',
        message || 'Could not save mobile number. Please try again.',
      );
    }
  };

  const handleMobileBlur = () => {
    setPhoneTouched(true);

    // No error on the field, but the signed-in user has no saved mobile
    // number yet — offer to save the number they just entered.
    if (mobileRaw.trim() && phoneValid && !user?.phone) {
      Alert.alert(
        'Save Mobile Number',
        'Would you like to save this mobile number to your profile?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save', onPress: handleSaveMobileNumber },
        ],
      );
    }
  };

  const handleSelectCountry = (selectedIso: string) => {
    setCountryIso(selectedIso);
  };

  // Fill the mobile field with the signed-in user's stored phone number.
  const handleUseUserPhone = () => {
    if (!user?.phone) {
      Alert.alert(
        'No Mobile Number',
        'No mobile number saved on your profile.',
      );
      return;
    }
    setMobileRaw(user.phone);
    setMobileNumber(user.phone);
    if (user.phoneCountryCode) {
      setCountryIso(user.phoneCountryCode);
    }
  };

  // Open budget picker bottom sheet
  const handleBudgetPress = () => {
    setSelectedBudget(budget);
    budgetSheetRef.current?.present();

    setTimeout(() => {
      mobileNumberRef.current?.blur();
      descriptionRef.current?.blur();
    }, 700);
  };

  // Confirm preset selection and close the sheet
  const handleBudgetConfirm = () => {
    if (selectedBudget) {
      setBudget(selectedBudget);
    }
    budgetSheetRef.current?.dismiss();
  };

  // Open custom amount bottom sheet
  const handleCustomPress = () => {
    setCustomAmount('');
    setCustomAmountRaw('');
    budgetSheetRef.current?.dismiss();
    setTimeout(() => {
      customBudgetSheetRef.current?.present();
    }, 300);
  };

  const handleCustomAmountChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    setCustomAmountRaw(digits);
    setCustomAmount(formatMoney(digits));
  };

  // Confirm custom amount
  const handleCustomConfirm = () => {
    if (customAmountRaw && Number(customAmountRaw) > 0) {
      setBudget(customAmountRaw);
      customBudgetSheetRef.current?.dismiss();
    } else {
      Alert.alert('Invalid Amount', 'Please enter a valid positive number.');
    }
    setTimeout(() => {
      mobileNumberRef.current?.blur();
      descriptionRef.current?.blur();
    }, 700);
  };

  // Open duration picker bottom sheet
  const handleDurationPress = () => {
    setDurationValueDraft(durationValue);
    setDurationUnitDraft(durationUnit || 'days');
    durationSheetRef.current?.present();
  };

  const handleDurationConfirm = () => {
    const amount = Number(durationValueDraft);
    if (Number.isFinite(amount) && amount > 0 && durationUnitDraft) {
      setDurationValue(String(amount));
      setDurationUnit(durationUnitDraft);
      durationSheetRef.current?.dismiss();
    } else {
      Alert.alert('Invalid Duration', 'Please enter a valid number.');
    }
    setTimeout(() => {
      mobileNumberRef.current?.blur();
      descriptionRef.current?.blur();
    }, 700);
  };

  const handleDurationClear = () => {
    setDurationValue('');
    setDurationUnit('');
    durationSheetRef.current?.dismiss();
    setTimeout(() => {
      mobileNumberRef.current?.blur();
    }, 300);
  };

  const selectedWorkTypes = React.useMemo(() => {
    if (!workTypes) return [];
    if (categories && categories.length > 0) {
      return workTypes.filter(wt =>
        categories.includes(wt.slug as WorkCategory),
      );
    }
    if (category) {
      const match = workTypes.find(wt => wt.slug === category);
      return match ? [match] : [];
    }
    return [];
  }, [workTypes, categories, category]);

  const handleChooseWorkType = () => {
    navigation.navigate('SelectWorkType');
  };

  const hasCategories = (categories && categories.length > 0) || !!category;
  const isValid =
    description.trim() && hasCategories && budget && location.trim();

  const handleCreateAnother = () => {
    setShowPostedModal(false);
    resetForm();
    setMobileRaw('');
    setPhoneTouched(false);
    defaultedLocationRef.current = false;
    silentLocRef.current = false;
  };

  const handleSeePostedWorks = () => {
    setShowPostedModal(false);
    resetForm();
    setMobileRaw('');
    setPhoneTouched(false);
    defaultedLocationRef.current = false;
    silentLocRef.current = false;
    navigation.navigate('AddedWork');
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    if (!isValid) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      setIsLoading(false);

      return;
    }

    // Validate phone format only when a number was provided.
    if (mobileRaw.trim() && !phoneValid) {
      Alert.alert(
        'Invalid Mobile Number',
        `Please enter a valid ${country.name} mobile number.`,
      );
      setIsLoading(false);
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to post a work.');
      setIsLoading(false);
      return;
    }

    // Prompt for push notifications before posting work (non-blocking)
    await requestPushNotif(user.id);

    // Save/update user's profile phone and phoneCountryCode if different/unset.
    if (
      parsedPhone &&
      (user.phone !== parsedPhone.nationalNumber ||
        user.phoneCountryCode !== parsedPhone.country)
    ) {
      try {
        await updateProfile(user.id, {
          phone: parsedPhone.nationalNumber,
          phoneCountryCode: parsedPhone.country || null,
        });
        setAuthUser({
          ...user,
          phone: parsedPhone.nationalNumber,
          phoneCountryCode: parsedPhone.country || null,
        });
      } catch (dbErr) {
        console.warn(
          '[PostWork] Failed to save mobile number and country code to user profile on submit:',
          dbErr,
        );
      }
    }

    const finalCategories =
      categories && categories.length > 0
        ? categories
        : category
        ? [category]
        : [];

    try {
      await createWork({
        description: description.trim(),
        category: finalCategories.join(',') as WorkCategory,
        categories: finalCategories,
        budget: parseFloat(budget),
        budgetType,
        currency: currencySymbol,
        location: location.trim(),
        latitude,
        longitude,
        contactPhone: parsedPhone?.number,
        phoneCountryCode: parsedPhone?.country,
        postedBy: user.id,
        status: 'open',
        images: images.length > 0 ? images : undefined,
        scheduledDate: scheduledDate || undefined,
        durationValue: durationValue ? Number(durationValue) : undefined,
        durationUnit: durationUnit || undefined,
        tags: tags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
      });

      setShowPostedModal(true);
      setIsLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.warn('[PostWork] createWork error:', message);
      Alert.alert('Error', message || 'Failed to post work. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const durationDisplay = (() => {
    const amount = Number(durationValue);
    if (
      !durationValue ||
      !durationUnit ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return '';
    }
    const unitLabel = amount === 1 ? durationUnit.slice(0, -1) : durationUnit;
    return `${amount.toLocaleString()} ${unitLabel}`;
  })();

  return (
    <View className="flex-1 bg-white">
      <View style={{ paddingTop: insets.top }} />
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="flex-row items-center mr-3 p-1.5 rounded-full"
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <MaterialIcons name="arrow-back" size={24} color="#111827" />
          <Text className="text-2xl ml-4 font-bold text-gray-900">
            Post Something
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 100,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row items-center justify-between mt-4 mb-2">
            <Text className="text-2xl ml-1 my-2 font-bold text-gray-900">
              Describe
            </Text>
            <View className="flex-row items-center">
              <CameraButton
                onPress={handleCameraCapture}
                loading={isCapturing}
              />
              <UploadButton
                navigation={navigation}
                onPress={handlePickMedia}
                loading={isPickingMedia}
              />
            </View>
          </View>
          <DescriptionField
            value={description}
            onChangeText={setDescription}
            ref={descriptionRef}
          />

          <LocationField location={location} navigation={navigation} />

          <ImageUploadField
            images={images}
            navigation={navigation}
            onRemoveImage={handleRemoveImage}
            isUploading={isCapturing || isPickingMedia}
          />

          <MobileNumberField
            value={mobileRaw}
            onChangeText={handleMobileChange}
            onBlur={handleMobileBlur}
            country={country}
            countryIso={countryIso}
            onSelectCountry={handleSelectCountry}
            showError={showPhoneError}
            userPhone={user?.phone}
            onUseUserPhone={handleUseUserPhone}
            ref={mobileNumberRef}
          />

          <WorkTypeField
            selectedWorkTypes={selectedWorkTypes}
            onPress={handleChooseWorkType}
          />

          <BudgetField
            budget={budget}
            budgetType={budgetType}
            currencySymbol={currencySymbol}
            onPress={handleBudgetPress}
          />

          <OtherDetailsSection
            scheduledDate={scheduledDate}
            setScheduledDate={setScheduledDate}
            tags={tags}
            setTags={setTags}
            durationDisplay={durationDisplay}
            onDurationPress={handleDurationPress}
          />
        </ScrollView>

        {/* Submit Button - fixed at bottom */}
        <View
          style={{
            paddingBottom: isKeyboardActive ? 16 : Math.max(bottomPad, 16),
          }}
          className="px-5 pt-4 bg-white"
        >
          <TouchableOpacity
            className={`rounded-xl py-4 items-center ${
              isValid && !isLoading ? 'bg-emerald-600' : 'bg-gray-300'
            }`}
            activeOpacity={0.8}
            onPress={handleSubmit}
            disabled={!isValid || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-base font-bold text-white">Post Work</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      {/* Budget Picker Bottom Sheet */}
      <BudgetPickerSheet
        sheetRef={budgetSheetRef}
        snapPoints={budgetSnapPoints}
        backdropComponent={renderBackdrop}
        budgetType={budgetType}
        setBudgetType={setBudgetType}
        selectedBudget={selectedBudget}
        setSelectedBudget={setSelectedBudget}
        currencySymbol={currencySymbol}
        onCustom={handleCustomPress}
        onConfirm={handleBudgetConfirm}
      />
      {/* Custom Budget Bottom Sheet */}
      <CustomBudgetSheet
        sheetRef={customBudgetSheetRef}
        snapPoints={customBudgetSnapPoints}
        backdropComponent={renderBackdrop}
        customAmount={customAmount}
        currencySymbol={currencySymbol}
        onChangeText={handleCustomAmountChange}
        onConfirm={handleCustomConfirm}
      />
      {/* Work Duration Bottom Sheet */}
      <WorkDurationSheet
        sheetRef={durationSheetRef}
        snapPoints={durationSnapPoints}
        backdropComponent={renderBackdrop}
        value={durationValueDraft}
        onChangeValue={setDurationValueDraft}
        unit={durationUnitDraft}
        onChangeUnit={setDurationUnitDraft}
        onConfirm={handleDurationConfirm}
        showClear={!!(durationValue || durationUnit)}
        onClear={handleDurationClear}
      />
      {/* Success Modal */}
      <WorkPostedModal
        visible={showPostedModal}
        onCreateAnother={handleCreateAnother}
        onSeePostedWorks={handleSeePostedWorks}
      />
    </View>
  );
}
