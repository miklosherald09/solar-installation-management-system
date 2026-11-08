# Smooth animated tab bar — patch notes

## Files

- `store/useTabBarStore.ts` — single boolean (`visible`) shared across the app.
- `hooks/useHideTabBar.ts` — call this in a screen to hide the bar while that screen is focused, and restore it automatically on blur.
- `components/AnimatedTabBar.tsx` — replaces the default `BottomTabBar`; slides it in/out via `react-native-reanimated` (runs on the UI thread, no bridge jank).
- `navigation/AppNavigator.tsx` — updated: `Tab.Navigator` now renders `tabBar={(props) => <AnimatedTabBar {...props} />}`, and the per-route `tabBarStyle` branching (the `routeName === 'Call' || ...` blocks) is gone.

## What changed vs. your original

1. **HomeTab / MessagesTab**: previously hid the bar by matching `getFocusedRouteNameFromRoute` against a hardcoded list (`Call`, `PostWork`, `WorkDetail`, ...) and swapping `tabBarStyle` to `{ display: 'none' }`. That swap was instant — no animation — and depended on keeping that route list in sync with every new screen you add.
   **Now**: those screens call `useHideTabBar()` themselves (see below). New screens just add one line instead of another entry in AppNavigator's route-name list.

2. **ProfileTab**: previously _always_ had `tabBarStyle: { display: 'none' }`, unconditionally. Preserved exactly — `ProfileStackNavigator` calls `useHideTabBar()` at its top level, so the bar hides for the whole tab regardless of which screen inside it is focused.

3. **The height bug** your original comment described (`tabBarStyle: undefined` clobbering `TAB_BAR_STYLE` via `Object.assign`) is now structurally impossible — `tabBarStyle: TAB_BAR_STYLE` is set once in `screenOptions` and never overridden per-screen again.

## What you still need to do

I don't have your actual screen files (only `AppNavigator.tsx` was shared with me), so add one line to each screen that used to trigger the hardcoded hide-list:

```tsx
import { useHideTabBar } from '../../hooks/useHideTabBar'; // adjust relative path

function CallScreen() {
  useHideTabBar();
  // ...rest of the screen
}
```

Add it to: `CallScreen`, `PostWorkScreen`, `SelectWorkTypeScreen`, `UpdateLocationScreen`, `WorkDetailScreen`, `WorkSettingsScreen`, `EditWorkScreen`, `AddedWorkScreen`, `UploadWorkPictureScreen`, and `ConversationScreen` (that last one only hid the bar on the Messages tab before — same one-liner covers it).

## Dependency

Requires `react-native-reanimated` (v2+). If it's not already in your project:

```bash
npm install react-native-reanimated
# then follow the babel plugin + entry-point setup in their install docs,
# since reanimated needs a babel plugin, not just the package.
```

If you'd rather avoid adding reanimated, the plain `Animated` API from `react-native` works too — swap `AnimatedTabBar.tsx`'s internals for `Animated.Value` + `Animated.timing`, same store and hook stay identical either way.
