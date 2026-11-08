import React from 'react';
import { View, Image } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface AvatarProps {
  photo?: string | null;
  size?: number;
  iconName?: IconName;
}

/**
 * Reusable circular avatar.  Shows the user's photo when available,
 * otherwise falls back to a tinted circle with an icon.
 */
export function Avatar({
  photo,
  size = 96,
  iconName = 'person',
}: AvatarProps): React.JSX.Element {
  return (
    <View
      className="rounded-full bg-emerald-100 items-center justify-center overflow-hidden"
      style={{ width: size, height: size }}
    >
      {photo ? (
        <Image
          source={{ uri: photo }}
          style={{ width: size, height: size }}
          resizeMode="cover"
        />
      ) : (
        <MaterialIcons name={iconName} size={size * 0.45} color="#059669" />
      )}
    </View>
  );
}
