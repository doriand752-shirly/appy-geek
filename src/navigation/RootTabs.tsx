import { Ionicons } from '@expo/vector-icons';
import {
  createBottomTabNavigator,
  BottomTabBar,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { useMemo } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { BottomAdStrip } from '../components/BottomAdStrip';
import { useAppSettings } from '../context/AppSettingsContext';
import { useTranslation } from '../i18n';
import { DiscussionsScreen } from '../screens/DiscussionsScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SubscriptionsScreen } from '../screens/SubscriptionsScreen';
import { ThemesScreen } from '../screens/ThemesScreen';
import { shouldExpectVerticalSystemBars } from '../utils/duoChrome';

export type RootTabParamList = {
  Accueil: undefined;
  Thèmes: undefined;
  Discussions: undefined;
  Abonnements: undefined;
  Paramètres: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

/**
 * iPhone Duo (SDK 27.1): system chrome expects tabs on the trailing edge.
 * Expo 54 cannot use createNativeBottomTabNavigator (needs screens 4.30 / SDK 57),
 * so we use JS tabs with tabBarPosition left/right — same layout Apple documents.
 */
function DuoAwareTabBar(props: BottomTabBarProps) {
  const { width, height } = useWindowDimensions();
  const vertical = shouldExpectVerticalSystemBars(width, height);
  if (vertical) {
    return <BottomTabBar {...props} />;
  }
  return (
    <View>
      <BottomAdStrip />
      <BottomTabBar {...props} />
    </View>
  );
}

export function RootTabs() {
  const { palette } = useAppSettings();
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const vertical = shouldExpectVerticalSystemBars(width, height);

  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      lazy: true,
      freezeOnBlur: true,
      tabBarActiveTintColor: palette.accent,
      tabBarInactiveTintColor: palette.textMuted,
      // Duo outer (squat) + inner landscape → barre latérale (trailing / droite).
      tabBarPosition: (vertical ? 'right' : 'bottom') as 'right' | 'bottom',
      tabBarVariant: (vertical ? 'material' : 'uikit') as 'material' | 'uikit',
      tabBarLabelPosition: (vertical ? 'below-icon' : undefined) as
        | 'below-icon'
        | undefined,
      tabBarStyle: {
        backgroundColor: palette.surface,
        borderTopColor: palette.border,
        ...(vertical
          ? {
              borderTopColor: 'transparent',
              borderLeftColor: palette.border,
              borderLeftWidth: 1,
              minWidth: 72,
            }
          : null),
      },
    }),
    [palette, vertical],
  );

  return (
    <Tab.Navigator tabBar={DuoAwareTabBar} screenOptions={screenOptions}>
      <Tab.Screen
        name="Accueil"
        component={HomeScreen}
        options={{
          tabBarLabel: t('tabs.home'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Thèmes"
        component={ThemesScreen}
        options={{
          tabBarLabel: t('tabs.themes'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Discussions"
        component={DiscussionsScreen}
        options={{
          tabBarLabel: t('tabs.discussions'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Abonnements"
        component={SubscriptionsScreen}
        options={{
          tabBarLabel: t('tabs.subscriptions'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Paramètres"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('tabs.settings'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
