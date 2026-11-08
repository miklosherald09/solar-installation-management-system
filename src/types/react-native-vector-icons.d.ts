/**
 * Ambient type declaration for react-native-vector-icons/MaterialIcons.
 *
 * react-native-vector-icons@10.x ships Flow types only (no .d.ts), so we
 * declare the subset of props we use here. This keeps TypeScript happy while
 * the package migrates to per-family packages.
 */
declare module 'react-native-vector-icons/MaterialIcons' {
  import type { ComponentType } from 'react';
  import type { TextStyle } from 'react-native';

  export interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: TextStyle;
    allowFontScaling?: boolean;
    testID?: string;
  }

  const MaterialIcons: ComponentType<IconProps>;
  export default MaterialIcons;
}

declare module 'react-native-vector-icons/FontAwesome5' {
  import type { ComponentType } from 'react';
  import type { TextStyle } from 'react-native';

  export interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: TextStyle;
    allowFontScaling?: boolean;
    testID?: string;
  }

  const FontAwesome5: ComponentType<IconProps>;
  export default FontAwesome5;
}
