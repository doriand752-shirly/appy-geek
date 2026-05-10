import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

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
    <FeedsProvider>
      <AppSettingsProvider>
        <MobileAdsBootstrap />
        <NavigationRoot />
      </AppSettingsProvider>
    </FeedsProvider>
  );
}
