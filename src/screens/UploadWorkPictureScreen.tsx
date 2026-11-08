/**
 * UploadWorkPictureScreen
 * Multi-image upload screen for a work's location pictures.
 *
 *  - Pick images from the device gallery (multiple selection).
 *  - Upload picked images to MinIO bucket.
 *  - Show upload progress and previews.
 *  - "OK" button at the bottom returns to PostWorkScreen with the uploaded
 *    image URLs stored in the form store.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  applyImages,
  usePostWorkFormStore,
} from '../store/usePostWorkFormStore';
import { useAuthStore } from '../store/useAuthStore';
import {
  uploadImages,
  getImageUrl,
  isVideoUrl,
} from '../services/minioService';
import { playVideo } from '../utils';
import { HomeStackParamList } from '../types';
import { useHideTabBar } from '../navigation/useHideTabBar';

type UploadWorkPictureScreenNavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  'UploadWorkPicture'
>;

/** Placeholder "work ID" used before the work is actually created. */
const TEMP_WORK_ID = `temp-${Date.now()}`;

export function UploadWorkPictureScreen(): React.JSX.Element {
  useHideTabBar();
  const navigation = useNavigation<UploadWorkPictureScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { images } = usePostWorkFormStore();

  const [uploading, setUploading] = React.useState(false);
  const [uploadedKeys, setUploadedKeys] = React.useState<string[]>(images);
  const bottomPad = Platform.OS === 'android' ? insets.bottom : 0;

  const handlePickImages = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'mixed',
        selectionLimit: 10,
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.7,
        videoQuality: 'high',
      });

      if (result.didCancel || !result.assets) {
        return;
      }

      const assets = result.assets.filter(a => a.uri);

      if (assets.length === 0) {
        return;
      }

      // Upload to MinIO
      await handleUpload(assets);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to pick photos or videos.');
    }
  };

  const handleUpload = async (mediaInputs: any[]) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to upload images.');
      return;
    }

    setUploading(true);
    try {
      const results = await uploadImages(mediaInputs, user.id, TEMP_WORK_ID);
      const newKeys = results.map(r => r.key);
      setUploadedKeys(prev => [...prev, ...newKeys]);
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Could not upload images.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setUploadedKeys(prev => prev.filter((_, i) => i !== index));
  };

  const handleOk = () => {
    applyImages(uploadedKeys);
    navigation.goBack();
  };

  const allItems = [
    ...uploadedKeys.map((key, i) => ({
      type: 'uploaded' as const,
      url: getImageUrl(key),
      index: i,
    })),
  ];

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
            Upload Media
          </Text>
        </View>
      </View>

      {/* Content */}
      <View className="flex-1 px-5 pt-6">
        <Text className="text-base text-gray-600 mb-4">
          Add photos or videos of the work location to help workers find it
          easily.
        </Text>

        {/* Upload button */}
        <TouchableOpacity
          className={`flex-row items-center justify-center bg-gray-100 rounded-xl px-4 py-4 mb-6 border-2 border-dashed border-gray-300 ${
            uploading ? 'opacity-50' : ''
          }`}
          activeOpacity={0.7}
          onPress={handlePickImages}
          disabled={uploading}
        >
          <MaterialIcons name="add-photo-alternate" size={24} color="#059669" />
          <Text className="ml-2 text-base font-semibold text-gray-700">
            {uploading ? 'Uploading…' : 'Add Photos or Videos'}
          </Text>
          {uploading && (
            <ActivityIndicator size="small" color="#059669" className="ml-2" />
          )}
        </TouchableOpacity>

        {/* Image / Video list */}
        {allItems.length === 0 ? (
          <View className="items-center py-12">
            <MaterialIcons name="photo-library" size={48} color="#D1D5DB" />
            <Text className="text-sm text-gray-400 mt-2">
              No photos or videos added yet
            </Text>
          </View>
        ) : (
          <FlatList
            data={allItems}
            keyExtractor={(_, index) => String(index)}
            numColumns={3}
            columnWrapperStyle={{ gap: 8, marginBottom: 8 }}
            renderItem={({ item }) => {
              const isVideo = isVideoUrl(item.url);

              return (
                <View className="relative flex-1 aspect-square rounded-xl overflow-hidden bg-gray-100">
                  {isVideo ? (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => playVideo(item.url)}
                      className="w-full h-full bg-gray-900 items-center justify-center"
                    >
                      <MaterialIcons
                        name="play-circle-filled"
                        size={36}
                        color="#FFFFFF"
                      />
                      <View className="absolute bottom-1.5 left-1.5 bg-black/70 rounded px-1 py-0.5 flex-row items-center">
                        <MaterialIcons
                          name="videocam"
                          size={10}
                          color="#10B981"
                        />
                        <Text className="text-[9px] text-white font-bold tracking-wider ml-0.5">
                          PLAY
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <Image
                      source={{ uri: item.url }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  )}
                  {/* Remove button overlay */}
                  <TouchableOpacity
                    className="absolute top-1 right-1 bg-black/50 rounded-full p-1"
                    onPress={() => handleRemoveImage(item.index)}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  >
                    <MaterialIcons name="close" size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        )}
      </View>

      {/* OK button at the bottom */}
      <View
        className="bg-white border-t border-gray-200 px-5 py-4"
        style={{ paddingBottom: bottomPad + 16 }}
      >
        <TouchableOpacity
          className="rounded-xl py-4 items-center bg-emerald-600"
          activeOpacity={0.8}
          onPress={handleOk}
        >
          <Text className="text-base font-bold text-white">OK</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
