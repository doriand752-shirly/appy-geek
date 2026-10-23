import { NavigationContainer } from '@react-navigation/native';
import type { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { MobileAdsBootstrap } from './src/components/MobileAdsBootstrap';
import { SplashLoadingGate } from './src/components/SplashLoadingGate';
import { AppSettingsProvider, useAppSettings } from './src/context/AppSettingsContext';
import { AuthProvider } from './src/context/AuthContext';
import { CloudSyncBridge } from './src/context/CloudSyncBridge';
import { CommentsProvider } from './src/context/CommentsContext';
import { FeedsProvider } from './src/context/FeedsContext';
import { DeepLinkEffects } from './src/navigation/DeepLinkEffects';
import { navigationRef } from './src/navigation/navigationRef';
import { RootNavigator, type RootStackParamList } from './src/navigation/RootNavigator';

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'appigeek://'],
  config: {
    screens: {
      Main: {
        screens: {
          Accueil: 'home',
          Thèmes: 'topics',
          Discussions: 'discussions',
          Abonnements: 'feeds',
          Paramètres: 'settings',
        },
      },
      ArticleReader: {
        path: 'article',
        parse: {
          articleId: String,
          url: (value: string) => decodeURIComponent(value),
          title: (value: string) => decodeURIComponent(value),
        },
      },
      OfflineArticles: 'offline',
      ThemePicker: 'themes',
      ThemeArticles: {
        path: 'theme/:themeId',
        parse: {
          themeId: String,
          themeLabel: (value: string) => decodeURIComponent(value),
        },
      },
    },
  },
};

function NavigationRoot() {
  const { navigationTheme, statusBarStyle } = useAppSettings();
  return (
    <>
      <StatusBar style={statusBarStyle} />
      <NavigationContainer ref={navigationRef} theme={navigationTheme} linking={linking}>
        <DeepLinkEffects />
        <RootNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AppSettingsProvider>
          <FeedsProvider>
            <SplashLoadingGate>
              <CloudSyncBridge />
              <CommentsProvider>
                <MobileAdsBootstrap />
                <NavigationRoot />
              </CommentsProvider>
            </SplashLoadingGate>
          </FeedsProvider>
        </AppSettingsProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
