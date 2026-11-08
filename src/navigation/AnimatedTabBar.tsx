import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { BottomTabBar, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTabBarStore } from './useTabBarStore';

/**
 * Overlays the default BottomTabBar on top of the tab scene.
 *
 * The bar is rendered absolutely positioned, so it never participates in
 * the tab navigator's flex layout. Screen content therefore fills the whole
 * available height and does NOT reflow when the bar hides or shows — the
 * only thing that changes is the bar's own `translateY` transform.
 *
 * (The previous implementation animated the wrapper's `height` down to 0.
 * That removes the bar's reserved layout space, but it also makes the
 * content jump every time the bar appears or disappears. Absolute
 * positioning plus a transform keeps the content fully stable.)
 */
export function AnimatedTabBar(props: BottomTabBarProps) {
  const visible = useTabBarStore(s => s.visible);

  // Measured on first layout so we know exactly how far to slide the bar
  // down when hiding it (includes any safe-area inset React Navigation adds).
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (measuredHeight === 0) return; // wait for first real measurement
    translateY.value = withTiming(visible ? 0 : measuredHeight, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible, measuredHeight, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && h !== measuredHeight) {
      setMeasuredHeight(h);
      // Seed the offset on first measurement so the bar doesn't flash
      // visible before the effect above runs.
      if (translateY.value === 0 && !visible) {
        translateY.value = h;
      }
    }
  };

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/*
        This plain View (not BottomTabBar itself) is what we measure —
        BottomTabBar's own props don't reliably forward `onLayout`/`style`
        to its root element, so we wrap it instead.
      */}
      <View onLayout={handleLayout}>
        <BottomTabBar {...props} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 10,
  },
});
