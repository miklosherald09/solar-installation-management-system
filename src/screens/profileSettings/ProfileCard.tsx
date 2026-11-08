import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface Props {
  photo?: string | null;
  name: string;
  email: string;
  memberSince: Date;
  onEditName?: () => void;
  onEditPhoto?: () => void;
}

export function ProfileCard({
  photo,
  name,
  email,
  memberSince,
  onEditName,
  onEditPhoto,
}: Props): React.JSX.Element {
  return (
    <View className="bg-white mx-5 mt-5 rounded-2xl p-5 shadow-sm border border-gray-100">
      <View className="flex-row items-center">
        {onEditPhoto ? (
          <TouchableOpacity
            onPress={onEditPhoto}
            activeOpacity={0.7}
            className="w-16 h-16 rounded-full bg-emerald-100 items-center justify-center mr-4 overflow-hidden relative"
          >
            {photo ? (
              <Image
                source={{ uri: photo }}
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <MaterialIcons name="person" size={32} color="#059669" />
            )}
            <View className="absolute bottom-0 left-0 right-0 bg-black/40 py-0.5 items-center justify-center">
              <MaterialIcons name="photo-camera" size={10} color="#fff" />
            </View>
          </TouchableOpacity>
        ) : (
          <View className="w-16 h-16 rounded-full bg-emerald-100 items-center justify-center mr-4 overflow-hidden">
            {photo ? (
              <Image
                source={{ uri: photo }}
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <MaterialIcons name="person" size={32} color="#059669" />
            )}
          </View>
        )}

        <View className="flex-1">
          {onEditName ? (
            <TouchableOpacity
              onPress={onEditName}
              activeOpacity={0.7}
              className="flex-row items-center"
            >
              <Text className="text-xl font-bold text-gray-900 mr-1.5">
                {name}
              </Text>
              <MaterialIcons name="edit" size={16} color="#059669" />
            </TouchableOpacity>
          ) : (
            <Text className="text-xl font-bold text-gray-900">{name}</Text>
          )}
          <Text className="text-sm text-gray-500 mt-0.5">{email}</Text>
          <Text className="text-xs text-gray-400 mt-1">
            Member since{' '}
            {memberSince.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>
      </View>
    </View>
  );
}
