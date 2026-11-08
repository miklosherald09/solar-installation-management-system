import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useTabBarStore } from './useTabBarStore';

/**
 * Call this in any screen that should hide the bottom tab bar while it's
 * focused. The bar animates back in automatically when the screen loses
 * focus (navigated away from, or backgrounded by a pushed screen).
 *
 * Usage:
 *   function CallScreen() {
 *     useHideTabBar();
 *     ...
 *   }
 */
export function useHideTabBar(): void {
  const hide = useTabBarStore(s => s.hide);
  const show = useTabBarStore(s => s.show);

  useFocusEffect(
    useCallback(() => {
      hide();
      return () => show();
    }, [hide, show]),
  );
}
