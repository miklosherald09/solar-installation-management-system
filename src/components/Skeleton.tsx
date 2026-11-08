/**
 * Skeleton
 * A pulsing placeholder block used to indicate content is still loading.
 *
 * Compose it with Tailwind classes (size, rounding, margin) via `className`,
 * and pass any extra layout styles (e.g. aspectRatio) via `style`.
 */

import React from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';

interface SkeletonProps {
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({
  className,
  style,
}: SkeletonProps): React.JSX.Element {
  const opacity = React.useRef(new Animated.Value(0.35)).current;

  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      className={`bg-gray-200 ${className ?? ''}`}
      style={[style, { opacity }]}
    />
  );
}
