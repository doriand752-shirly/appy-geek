import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator, BottomTabBar } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';

import { BottomAdStrip } from '../components/BottomAdStrip';
import { useAppSettings } from '../context/AppSettingsContext';
import { useTranslation } from '../i18n';
import { DiscussionsScreen } from '../screens/DiscussionsScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SubscriptionsScreen } from '../screens/SubscriptionsScreen';
import { ThemesScreen } from '../screens/ThemesScreen';

export type RootTabParamList = {
  Accueil: undefined;
  Thèmes: undefined;
  Discussions: undefined;
  Abonnements: undefined;
  Paramètres: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

/** BottomAdStrip sits on tab routes only; ArticleReader is on the root stack (no tab bar strip). */

export function RootTabs() {
  const { palette } = useAppSettings();
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      tabBar={(props) => (
        <View>
          <BottomAdStrip />
          <BottomTabBar {...props} />
        </View>
      )}
      screenOptions={{
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
        },
      }}
    >
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
