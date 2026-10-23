import type { NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { NEWS_THEME_BY_ID } from '../constants/newsThemes';
import { useAppSettings } from '../context/AppSettingsContext';
import { useTranslation } from '../i18n';
import { AdminScreen } from '../screens/AdminScreen';
import { ArticleReaderScreen } from '../screens/ArticleReaderScreen';
import { ThemeArticlesScreen } from '../screens/ThemeArticlesScreen';
import { OfflineArticlesScreen } from '../screens/OfflineArticlesScreen';
import { ThemePickerScreen } from '../screens/ThemePickerScreen';
import { RootTabs, type RootTabParamList } from './RootTabs';

export type RootStackParamList = {
  Main: NavigatorScreenParams<RootTabParamList> | undefined;
  /** Données article lues depuis le contexte (évite la perte des gros HTML via les params). */
  ArticleReader: {
    articleId: string;
    url: string;
    title: string;
    /** HTML préchargé (lecture hors ligne). */
    offlineHtml?: string;
  };
  ThemeArticles: { themeId: string; themeLabel?: string };
  ThemePicker: undefined;
  OfflineArticles: undefined;
  Admin: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { palette } = useAppSettings();
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: palette.bg },
      }}
    >
      <Stack.Screen name="Main" component={RootTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="ArticleReader"
        component={ArticleReaderScreen}
        options={{
          presentation: 'modal',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="ThemeArticles"
        component={ThemeArticlesScreen}
        options={({ route }) => ({
          title:
            route.params.themeLabel ??
            NEWS_THEME_BY_ID[route.params.themeId]?.label ??
            t('nav.themeDefault'),
        })}
      />
      <Stack.Screen
        name="ThemePicker"
        component={ThemePickerScreen}
        options={{
          title: t('nav.themePicker'),
        }}
      />
      <Stack.Screen
        name="OfflineArticles"
        component={OfflineArticlesScreen}
        options={{ title: t('nav.offlineArticles') }}
      />
      <Stack.Screen
        name="Admin"
        component={AdminScreen}
        options={{ title: t('nav.admin') }}
      />
    </Stack.Navigator>
  );
}
