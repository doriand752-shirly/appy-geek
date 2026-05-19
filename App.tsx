import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { MobileAdsBootstrap } from './src/components/MobileAdsBootstrap';
import { AppSettingsProvider, useAppSettings } from './src/context/AppSettingsContext';
import { FeedsProvider } from './src/context/FeedsContext';
import { RootNavigator } from './src/navigation/RootNavigator';

function NavigationRoot() {
  const { navigationTheme, statusBarStyle } = useAppSettings();
  return (
    <>
      <StatusBar style={statusBarStyle} />
      <NavigationContainer theme={navigationTheme}>
        <RootNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppSettingsProvider>
        <FeedsProvider>
          <MobileAdsBootstrap />
          <NavigationRoot />
        </FeedsProvider>
      </AppSettingsProvider>
    </GestureHandlerRootView>
  );
}
