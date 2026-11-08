/**
 * EditProfileScreen
 * Reached from Profile → "Edit Profile".
 *
 * Lets the user update their display name, profile picture, phone, and location.
 * The new picture is uploaded to MinIO (`users/{id}/profile/...`), then the public
 * URL + name + phone are persisted via PATCH /users/:id/profile and written back
 * into the auth store so the whole app reflects the change immediately.
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useForm, Controller } from 'react-hook-form';
import { useAuthStore, setAuthUser } from '../../store/useAuthStore';
import { uploadProfilePicture } from '../../services/minioService';
import { updateProfile } from '../../services/userService';
import { ProfileStackParamList } from '../../types';
import { useHideTabBar } from '../../navigation/useHideTabBar';
import {
  EditProfileLocationSheet,
  EditProfileLocationSheetHandle,
} from './EditProfileLocationSheet';

type NavigationProp = NativeStackNavigationProp<
  ProfileStackParamList,
  'EditProfile'
>;

interface FormValues {
  name: string;
  phone: string;
}

export function EditProfileScreen(): React.JSX.Element {
  useHideTabBar();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'android' ? insets.bottom : 0;
  const { user } = useAuthStore();
  const locationSheetRef = React.useRef<EditProfileLocationSheetHandle>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: user?.name ?? '',
      phone: user?.phone ?? '',
    },
  });

  // Reset form values when user object loads/updates
  React.useEffect(() => {
    if (user) {
      reset({
        name: user.name ?? '',
        phone: user.phone ?? '',
      });
    }
  }, [user, reset]);

  const [photoUri, setPhotoUri] = React.useState<string | null>(
    user?.photo ?? null,
  );
  const [newPhotoFile, setNewPhotoFile] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Sync photoUri when user object initializes/updates
  React.useEffect(() => {
    if (user?.photo) {
      setPhotoUri(user.photo);
    }
  }, [user?.photo]);

  const handlePickPhoto = async () => {
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
      if (!uri) return;

      setNewPhotoFile(uri);
      setPhotoUri(uri);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to pick an image.');
    }
  };

  const handleSave = async (data: FormValues) => {
    if (!user) {
      Alert.alert('Error', 'You must be signed in to edit your profile.');
      return;
    }

    const trimmedName = data.name.trim();
    if (trimmedName.length < 2) {
      Alert.alert(
        'Invalid name',
        'Please enter your name (at least 2 characters).',
      );
      return;
    }

    setSaving(true);
    try {
      let photoUrl = user.photo;

      if (newPhotoFile) {
        const upload = await uploadProfilePicture(newPhotoFile, user.id);
        photoUrl = upload.url;
      }

      const payload: { name: string; photo?: string; phone?: string } = {
        name: trimmedName,
      };
      if (newPhotoFile && photoUrl) {
        payload.photo = photoUrl;
      }
      if (data.phone.trim()) {
        payload.phone = data.phone.trim();
      }

      await updateProfile(user.id, payload);

      setAuthUser({
        ...user,
        name: trimmedName,
        photo: photoUrl,
        phone: data.phone.trim() || null,
      });

      navigation.goBack();
    } catch (err: any) {
      Alert.alert(
        'Update failed',
        err?.message || 'Could not save your profile. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View style={{ height: insets.top }} className="bg-white" />

      {/* Header */}
      <View className="bg-white border-b border-gray-200">
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mr-3 p-1.5 rounded-full"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900">Edit Profile</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <View className="items-center">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handlePickPhoto}
            accessibilityLabel="Change profile photo"
            accessibilityRole="button"
          >
            <View
              className="bg-emerald-100 items-center justify-center border-2 border-emerald-200 overflow-hidden"
              style={{ width: 96, height: 96, borderRadius: 48 }}
            >
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: 96, height: 96 }}
                  resizeMode="cover"
                />
              ) : (
                <MaterialIcons name="person" size={48} color="#059669" />
              )}
            </View>
            <View className="flex-row items-center justify-center mt-3">
              <MaterialIcons name="photo-camera" size={16} color="#059669" />
              <Text className="text-sm font-semibold text-emerald-700 ml-1">
                Change photo
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Name */}
        <Text className="text-xs font-semibold text-gray-500 uppercase mt-6 mb-2">
          Name
        </Text>
        <Controller
          control={control}
          name="name"
          rules={{
            required: 'Name is required',
            minLength: {
              value: 2,
              message: 'Name must be at least 2 characters',
            },
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="Your name"
              placeholderTextColor="#9CA3AF"
              maxLength={100}
            />
          )}
        />
        {errors.name && (
          <Text className="text-xs text-red-500 mt-1">
            {errors.name.message}
          </Text>
        )}

        {/* Phone */}
        <Text className="text-xs font-semibold text-gray-500 uppercase mt-6 mb-2">
          Phone
        </Text>
        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              placeholder="+63 912 345 6789"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              maxLength={32}
            />
          )}
        />
        <Text className="text-xs text-gray-400 mt-1.5">
          Your mobile number, so other users can call you.
        </Text>

        {/* Location */}
        <Text className="text-xs font-semibold text-gray-500 uppercase mt-6 mb-2">
          Location
        </Text>
        <TouchableOpacity
          className="flex-row items-center bg-white border border-gray-200 rounded-xl px-4 py-3.5"
          activeOpacity={0.7}
          onPress={() => locationSheetRef.current?.open()}
        >
          <MaterialIcons name="place" size={20} color="#059669" />
          <Text
            className="flex-1 ml-2 text-base text-gray-900"
            numberOfLines={1}
          >
            {user?.location || 'Select location'}
          </Text>
          <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </ScrollView>

      {/* Save */}
      <View
        className="bg-white border-t border-gray-200 px-5 py-4"
        style={{ paddingBottom: bottomPad + 16 }}
      >
        <TouchableOpacity
          className="rounded-xl py-4 items-center bg-emerald-600"
          activeOpacity={0.8}
          onPress={handleSubmit(handleSave)}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-base font-bold text-white">Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <EditProfileLocationSheet ref={locationSheetRef} />
    </View>
  );
}
