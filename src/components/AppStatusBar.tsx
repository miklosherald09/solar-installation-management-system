import React from 'react';
import { StatusBar, Platform } from 'react-native';

export default function AppStatusBar() {
  const STATUS_BAR_COLOR = 'white'; // Your custom color

  return (
    <>
      <StatusBar
        translucent={Platform.OS === 'android'}
        backgroundColor={
          Platform.OS === 'android' ? 'transparent' : STATUS_BAR_COLOR
        } // Android only
        barStyle="dark-content" // Controls text/icon color ('light-content' or 'dark-content')
        animated={true}
      />
    </>
  );
}
