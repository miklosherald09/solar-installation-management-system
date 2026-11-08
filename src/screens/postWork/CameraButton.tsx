import React from 'react';
import { TouchableOpacity, ActivityIndicator } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface Props {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function CameraButton({
  onPress,
  loading,
  disabled,
}: Props): React.JSX.Element {
  return (
    <TouchableOpacity
      className="bg-white rounded-xl flex-row items-center justify-center mr-2.5"
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel="Take photo or video"
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator size="small" color="#059669" />
      ) : (
        <MaterialIcons name="photo-camera" size={28} color="#059669" />
      )}
    </TouchableOpacity>
  );
}
