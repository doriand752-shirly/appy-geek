import { Ionicons } from '@expo/vector-icons';
import {
  createBottomTabNavigator,
  BottomTabBar,
} from '@react-navigation/bottom-tabs';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';
import { Platform, View } from 'react-native';

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

/**
 * iOS: native UITabBarController so iPhone Duo (iOS 27.1 SDK) can move
 * the tab bar into the vertical side chrome with system toolbars.
 * Android / others: JS bottom tabs (unchanged behavior + ad strip).
 */
const useNativeIosTabs = Platform.OS === 'ios';

const NativeTab = createNativeBottomTabNavigator<RootTabParamList>();
const JsTab = createBottomTabNavigator<RootTabParamList>();

function NativeIosTabs() {
  const { palette } = useAppSettings();
  const { t } = useTranslation();

  return (
    <NativeTab.Navigator
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarActiveTintColor: palette.accent,
        tabBarStyle: {
          backgroundColor: palette.surface,
        },
        // Banner in system accessory (iOS 26+); Duo moves bars to the side automatically.
        bottomAccessory: () => <BottomAdStrip />,
      }}
    >
      <NativeTab.Screen
        name="Accueil"
        component={HomeScreen}
        options={{
          title: t('tabs.home'),
          tabBarLabel: t('tabs.home'),
          tabBarIcon: ({ focused }) => ({
            type: 'sfSymbol',
            name: focused ? 'house.fill' : 'house',
          }),
        }}
      />
      <NativeTab.Screen
        name="Thèmes"
        component={ThemesScreen}
        options={{
          title: t('tabs.themes'),
          tabBarLabel: t('tabs.themes'),
          tabBarIcon: ({ focused }) => ({
            type: 'sfSymbol',
            name: focused ? 'square.grid.2x2.fill' : 'square.grid.2x2',
          }),
        }}
      />
      <NativeTab.Screen
        name="Discussions"
        component={DiscussionsScreen}
        options={{
          title: t('tabs.discussions'),
          tabBarLabel: t('tabs.discussions'),
          tabBarIcon: ({ focused }) => ({
            type: 'sfSymbol',
            name: focused ? 'bubble.left.and.bubble.right.fill' : 'bubble.left.and.bubble.right',
          }),
        }}
      />
      <NativeTab.Screen
        name="Abonnements"
        component={SubscriptionsScreen}
        options={{
          title: t('tabs.subscriptions'),
          tabBarLabel: t('tabs.subscriptions'),
          tabBarIcon: ({ focused }) => ({
            type: 'sfSymbol',
            name: focused ? 'safari.fill' : 'safari',
          }),
        }}
      />
      <NativeTab.Screen
        name="Paramètres"
        component={SettingsScreen}
        options={{
          title: t('tabs.settings'),
          tabBarLabel: t('tabs.settings'),
          tabBarIcon: ({ focused }) => ({
            type: 'sfSymbol',
            name: focused ? 'gearshape.fill' : 'gearshape',
          }),
        }}
      />
    </NativeTab.Navigator>
  );
}

function JsBottomTabs() {
  const { palette } = useAppSettings();
  const { t } = useTranslation();

  return (
    <JsTab.Navigator
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
      <JsTab.Screen
        name="Accueil"
        component={HomeScreen}
        options={{
          tabBarLabel: t('tabs.home'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <JsTab.Screen
        name="Thèmes"
        component={ThemesScreen}
        options={{
          tabBarLabel: t('tabs.themes'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <JsTab.Screen
        name="Discussions"
        component={DiscussionsScreen}
        options={{
          tabBarLabel: t('tabs.discussions'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
          ),
        }}
      />
      <JsTab.Screen
        name="Abonnements"
        component={SubscriptionsScreen}
        options={{
          tabBarLabel: t('tabs.subscriptions'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" size={size} color={color} />
          ),
        }}
      />
      <JsTab.Screen
        name="Paramètres"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('tabs.settings'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </JsTab.Navigator>
  );
}

export function RootTabs() {
  return useNativeIosTabs ? <NativeIosTabs /> : <JsBottomTabs />;
}
