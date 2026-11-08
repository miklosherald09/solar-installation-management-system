import { create } from 'zustand';

interface TabBarState {
  /** Whether the bottom tab bar should be visible. */
  visible: boolean;
  /** Hide the bar immediately, cancelling any pending show. */
  hide: () => void;
  /**
   * Indicate a screen no longer needs the bar hidden. The bar is only shown
   * (after a short, cancellable delay) once no screen wants it hidden.
   */
  show: () => void;
}

/**
 * Number of currently focused screens that requested the bar be hidden.
 *
 * Using a counter (instead of a plain boolean) makes visibility robust to the
 * order in which React Navigation emits `focus`/`blur`. In native-stack the
 * outgoing screen's `blur` can fire either just before or well after the
 * incoming screen's `focus`; a boolean + short "show" delay alone could still
 * flash the bar open (e.g. PostWork -> UploadWorkPicture). With a counter,
 * `show` never re-opens the bar while another screen still wants it hidden.
 */
let hiddenScreens = 0;

/**
 * Shared timer for debouncing the "show" request.
 *
 * React Navigation can emit the outgoing screen's `blur` immediately before
 * the incoming screen's `focus`. When navigating between two screens that
 * BOTH hide the tab bar, the blur cleanup would briefly drop the counter to
 * zero and request `show`. Delaying the show lets the next screen's `hide`
 * cancel it, so the bar stays hidden across such transitions.
 */
let pendingShowTimer: ReturnType<typeof setTimeout> | null = null;

const SHOW_DELAY_MS = 120;

export const useTabBarStore = create<TabBarState>(set => ({
  visible: true,
  hide: () => {
    hiddenScreens += 1;
    if (pendingShowTimer) {
      clearTimeout(pendingShowTimer);
      pendingShowTimer = null;
    }
    set({ visible: false });
  },
  show: () => {
    hiddenScreens = Math.max(0, hiddenScreens - 1);
    if (pendingShowTimer) {
      clearTimeout(pendingShowTimer);
      pendingShowTimer = null;
    }

    // Another focused screen still wants the bar hidden — keep it hidden.
    if (hiddenScreens > 0) {
      return;
    }

    pendingShowTimer = setTimeout(() => {
      pendingShowTimer = null;
      if (hiddenScreens === 0) {
        set({ visible: true });
      }
    }, SHOW_DELAY_MS);
  },
}));
