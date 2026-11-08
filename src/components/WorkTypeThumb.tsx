/**
 * WorkTypeThumb
 * Small square thumbnail for a work type: shows its image, or a colored
 * block with the work type's first letter when the image is missing or
 * fails to load. Used in the Work Type picker and the PostWork button.
 */

import React from 'react';
import { View, Text, Image } from 'react-native';
import { WorkType } from '../types';
import { MINIO_ENDPOINT } from '../services/minioService';

interface WorkTypeThumbProps {
  workType: WorkType;
  size?: number;
  borderRadius?: number;
  height?: number;
}

export function WorkTypeThumb({
  workType,
  size = 60,
  height = 44,
  borderRadius = 8,
}: WorkTypeThumbProps): React.JSX.Element {
  const [imageError, setImageError] = React.useState(false);
  const hasImage = !!workType.image && !imageError;

  return (
    <View
      style={{
        width: size,
        height: height || size,
        borderRadius,
        backgroundColor: '#6B7280',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {hasImage ? (
        <Image
          source={{ uri: `${MINIO_ENDPOINT}${workType.image}` }}
          style={{ width: size, height: size }}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <Text style={{ color: '#FFFFFF', fontSize: size, fontWeight: '700' }}>
          {MINIO_ENDPOINT}${workType.image}
        </Text>
      )}
    </View>
  );
}
