/**
 * HomeScreen
 * Main landing screen with work feed — thin composer.
 * Includes a "Near Me" bottom sheet for location-based work filtering.
 */

import React, { useRef, useCallback } from 'react';
import { View, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeWorkGrid } from './HomeWorkGrid';
import { NearMeModal, NearMeModalHandle } from '../../components/NearMeModal';
import { WelcomeModal } from '../../components/WelcomeModal';
import {
  CapableWorkTypesModal,
  CAPABLE_WORK_TYPES_DISMISSED_KEY,
} from '../../components/CapableWorkTypesModal';
import {
  useNearMeStore,
  clearNearMe,
  activateNearMe,
} from '../../store/useNearMeStore';
import { useAuthStore } from '../../store/useAuthStore';
import { saveNearMePreferences } from '../../services/nearMeService';
import { HomeHeader, HEADER_HEIGHT } from './HomeHeader';
import {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';

const HEADER_CONTENT_HEIGHT = HEADER_HEIGHT;

export function HomeScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const modalRef = useRef<NearMeModalHandle>(null);

  const { location, conciseLocation, latitude, longitude, rangeKm, active } =
    useNearMeStore();
  const { user, isAuthenticated, loading } = useAuthStore();

  // Welcome modal — shown once per unauthenticated session. "Continue as
  // guest" (or tapping the backdrop) dismisses it until the next app launch or logout.
  // Gated on `loading` so it never flashes while the session is still being
  // restored on app boot.
  const [welcomeDismissed, setWelcomeDismissed] = React.useState(false);
  const prevAuthRef = React.useRef(isAuthenticated);

  React.useEffect(() => {
    // When user logs out (transition from true to false), reset welcomeDismissed so modal appears
    if (prevAuthRef.current && !isAuthenticated) {
      setWelcomeDismissed(false);
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const showWelcomeModal = !loading && !isAuthenticated && !welcomeDismissed;

  // ── Capable Work Types modal ─────────────────────────────────────
  // Shown once per authenticated user who has no saved capable work types
  // and hasn't dismissed the prompt. Uses AsyncStorage so "Skip" is permanent.
  // The dismiss flag is scoped by user id so one user's choice never blocks
  // another user on the same device (the old key was global to the device).
  const userId = user?.id;
  const capableDismissKey = userId
    ? `${CAPABLE_WORK_TYPES_DISMISSED_KEY}:${userId}`
    : null;

  const [capableDismissed, setCapableDismissed] = React.useState(true); // default to hidden

  React.useEffect(() => {
    // Reset while switching users so a previous user's flag never leaks through.
    setCapableDismissed(true);
    if (!isAuthenticated || loading || !capableDismissKey) return;

    const checkDismissStatus = () => {
      AsyncStorage.getItem(capableDismissKey)
        .then(val => {
          setCapableDismissed(val === 'true');
        })
        .catch(() => {
          setCapableDismissed(false);
        });
    };

    // Check AsyncStorage for this user's dismiss flag
    checkDismissStatus();

    // Re-check whenever the app returns to active/foreground
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          checkDismissStatus();
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, loading, capableDismissKey]);

  const showCapableModal =
    !loading &&
    isAuthenticated &&
    !showWelcomeModal &&
    !capableDismissed &&
    (!user?.capableWorkTypes || user.capableWorkTypes.length === 0);

  const handleCapableClose = useCallback(() => {
    setCapableDismissed(true);
  }, []);

  // ── Near Me handlers ─────────────────────────────────────────────

  const handleNearMeApply = useCallback(() => {
    activateNearMe();
    // Persist to backend
    if (user?.id) {
      saveNearMePreferences(user.id, {
        nearMeLocation: location || null,
        nearMeConciseLocation: conciseLocation || null,
        nearMeLatitude: latitude ?? null,
        nearMeLongitude: longitude ?? null,
        nearMeRangeKm: rangeKm,
      });
    }
  }, [user?.id, location, conciseLocation, latitude, longitude, rangeKm]);

  const handleClearNearMe = useCallback(() => {
    clearNearMe();
    // Clear on backend as well
    if (user?.id) {
      saveNearMePreferences(user.id, {
        nearMeLocation: null,
        nearMeConciseLocation: null,
        nearMeLatitude: null,
        nearMeLongitude: null,
        nearMeRangeKm: 5,
      });
    }
  }, [user?.id]);

  const handleNearMePress = useCallback(() => {
    modalRef.current?.open();
  }, []);

  const nearMeFilter =
    active && latitude && longitude
      ? { latitude, longitude, rangeKm, conciseLocation, location }
      : undefined;

  const headerTranslateY = useSharedValue(0);
  const previousScrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      const currentY = event.contentOffset.y;
      const diff = currentY - previousScrollY.value;

      // On iOS, pulling down at the top produces a bounce-back with a
      // positive delta while the offset is negative/zero. Only hide the
      // header when the user actually scrolls down into the list so it
      // doesn't slide away during overscroll/refresh.
      if (diff > 0 && currentY > 0) {
        // Scrolling down
        headerTranslateY.value = Math.max(
          -HEADER_CONTENT_HEIGHT,
          headerTranslateY.value - diff,
        );
      } else if (diff < 0) {
        // Scrolling up (or rubber-banding at the top)
        headerTranslateY.value = Math.min(0, headerTranslateY.value - diff);
      }

      previousScrollY.value = currentY;
    },
  });

  return (
    <>
      <View className="flex-1 bg-gray-50">
        <View style={{ height: insets.top }} className="bg-gray-50" />
        <HomeHeader
          headerTranslateY={headerTranslateY}
          onNearMePress={handleNearMePress}
        />
        <HomeWorkGrid
          headerContentHeight={HEADER_CONTENT_HEIGHT}
          scrollHandler={scrollHandler}
          onNearMePress={handleNearMePress}
          nearMeFilter={nearMeFilter}
          onClearNearMe={active ? handleClearNearMe : undefined}
        />
      </View>
      <NearMeModal ref={modalRef} onApply={handleNearMeApply} />
      <WelcomeModal
        visible={showWelcomeModal}
        onClose={() => setWelcomeDismissed(true)}
      />
      <CapableWorkTypesModal
        visible={showCapableModal}
        onClose={handleCapableClose}
      />
    </>
  );
}
