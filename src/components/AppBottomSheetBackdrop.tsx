import React from 'react';
import { StatusBar, Platform } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

/**
 * A wrapper around `@gorhom/bottom-sheet`'s BottomSheetBackdrop.
 * When mounted (meaning the bottom sheet modal is open), it dynamically
 * configures the Android status bar icons/text to be light-content (white)
 * to remain highly visible against the darkened backdrop.
 */
export function AppBottomSheetBackdrop(props: BottomSheetBackdropProps) {
  return (
    <>
      {Platform.OS === 'android' && (
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent={true}
          animated={true}
        />
      )}
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    </>
  );
}
