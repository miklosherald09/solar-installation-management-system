import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { getImageUrl, isVideoUrl } from '../../services/minioService';
import { playVideo } from '../../utils/playVideo';
import { PostWorkNav } from './types';

interface Props {
  images: string[];
  navigation?: PostWorkNav;
  onRemoveImage?: (index: number) => void;
  isUploading?: boolean;
}

export function ImageUploadField({
  images,
  onRemoveImage,
  isUploading,
}: Props): React.JSX.Element | null {
  if (images.length === 0 && !isUploading) {
    return null;
  }

  return (
    <View className="mb-5">
      {/* Horizontal image preview list */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-1"
        contentContainerStyle={{ gap: 8 }}
      >
        {images.map((key, index) => (
          <View
            key={`${key}-${index}`}
            className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100"
          >
            {isVideoUrl(key) ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => playVideo(getImageUrl(key))}
                className="w-full h-full bg-gray-900 items-center justify-center"
              >
                <MaterialIcons
                  name="play-circle-filled"
                  size={30}
                  color="#FFFFFF"
                />
                <View className="absolute bottom-1 left-1 bg-black/70 rounded px-1 py-0.5 flex-row items-center">
                  <MaterialIcons name="videocam" size={10} color="#10B981" />
                  <Text className="text-[9px] text-white font-bold tracking-wider ml-0.5">
                    PLAY
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              <Image
                source={{ uri: getImageUrl(key) }}
                className="w-full h-full"
                resizeMode="cover"
              />
            )}
            {onRemoveImage && (
              <TouchableOpacity
                className="absolute top-1 right-1 bg-black/60 rounded-full p-1"
                onPress={() => onRemoveImage(index)}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                accessibilityLabel="Remove item"
                accessibilityRole="button"
              >
                <MaterialIcons name="close" size={12} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {isUploading && (
          <View className="w-20 h-20 rounded-xl bg-gray-100 border border-emerald-200 items-center justify-center">
            <ActivityIndicator size="small" color="#059669" />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
