import React from 'react';
import { TouchableOpacity, ActivityIndicator } from 'react-native';
import { PostWorkNav } from './types';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface Props {
  navigation?: PostWorkNav;
  onPress?: () => void;
  loading?: boolean;
}

export function UploadButton({ navigation, onPress, loading }: Props) {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (navigation) {
      navigation.navigate('UploadWorkPicture');
    }
  };

  return (
    <TouchableOpacity
      className="bg-white rounded-xl -mt-[3px] flex-row items-center"
      activeOpacity={0.7}
      onPress={handlePress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel="Upload photos or videos"
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color="#059669"
          style={{ width: 30, height: 30 }}
        />
      ) : (
        <MaterialIcons name="add-photo-alternate" size={30} color="#059669" />
      )}
    </TouchableOpacity>
  );
}
