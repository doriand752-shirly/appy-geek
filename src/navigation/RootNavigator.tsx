import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { NEWS_THEME_BY_ID } from '../constants/newsThemes';
import { useAppSettings } from '../context/AppSettingsContext';
import { ArticleReaderScreen } from '../screens/ArticleReaderScreen';
import { ThemeArticlesScreen } from '../screens/ThemeArticlesScreen';
import { OfflineArticlesScreen } from '../screens/OfflineArticlesScreen';
import { ThemePickerScreen } from '../screens/ThemePickerScreen';
import { RootTabs } from './RootTabs';

export type RootStackParamList = {
  Main: undefined;
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
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { palette } = useAppSettings();
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
            'Thème',
        })}
      />
      <Stack.Screen
        name="ThemePicker"
        component={ThemePickerScreen}
        options={{
          title: 'Thèmes de l’accueil',
        }}
      />
      <Stack.Screen
        name="OfflineArticles"
        component={OfflineArticlesScreen}
        options={{ title: 'Articles hors ligne' }}
      />
    </Stack.Navigator>
  );
}
