import * as Notifications from 'expo-notifications';
import * as QuickActions from 'expo-quick-actions';
import { useQuickActionCallback } from 'expo-quick-actions/hooks';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useAppSettings } from '../context/AppSettingsContext';
import { useTranslation } from '../i18n';

import { navigationRef } from './navigationRef';
import { openArticleFromData } from './openArticleFromData';
import type { RootTabParamList } from './RootTabs';

const TAB_SCREENS = new Set<keyof RootTabParamList>([
  'Accueil',
  'Thèmes',
  'Discussions',
  'Abonnements',
  'Paramètres',
]);

const ACTION_TO_TAB: Record<string, keyof RootTabParamList> = {
  home: 'Accueil',
  topics: 'Thèmes',
  themes: 'Thèmes',
  discussions: 'Discussions',
  feeds: 'Abonnements',
  discover: 'Abonnements',
  '/home': 'Accueil',
  '/topics': 'Thèmes',
  '/themes-tab': 'Thèmes',
  '/discussions': 'Discussions',
  '/feeds': 'Abonnements',
  '/discover': 'Abonnements',
  '/settings': 'Paramètres',
};

function navigateToTab(screen: string) {
  if (!navigationRef.isReady()) return;
  if (!TAB_SCREENS.has(screen as keyof RootTabParamList)) return;
  navigationRef.navigate('Main', { screen: screen as keyof RootTabParamList });
}

function handleNotificationData(data: Record<string, unknown> | undefined) {
  if (!data) return;
  if (openArticleFromData(data)) return;
  const screen = typeof data.screen === 'string' ? data.screen : 'Accueil';
  navigateToTab(screen);
}

function tabFromQuickAction(action: QuickActions.Action): keyof RootTabParamList | null {
  const href = action.params?.href;
  if (typeof href === 'string' && ACTION_TO_TAB[href]) return ACTION_TO_TAB[href];
  if (ACTION_TO_TAB[action.id]) return ACTION_TO_TAB[action.id];
  return null;
}

function handleIncomingURL(url: string) {
  const parsed = Linking.parse(url);
  const path = `${parsed.hostname ?? ''}${parsed.path ?? ''}`.toLowerCase();
  if (!path.includes('article')) return;
  const q = parsed.queryParams ?? {};
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(q)) {
    if (typeof value === 'string') data[key] = value;
    else if (Array.isArray(value) && typeof value[0] === 'string') data[key] = value[0];
  }
  openArticleFromData(data);
}

/**
 * Deep links push, widget, Watch et raccourcis icône.
 */
export function DeepLinkEffects() {
  const { appLocale } = useAppSettings();
  const { t } = useTranslation();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    void QuickActions.setItems([
      {
        id: 'home',
        title: t('quickAction.homeTitle'),
        subtitle: t('quickAction.homeSubtitle'),
        icon: 'home',
        params: { href: '/home' },
      },
      {
        id: 'discussions',
        title: t('quickAction.discussionsTitle'),
        subtitle: t('quickAction.discussionsSubtitle'),
        icon: 'message',
        params: { href: '/discussions' },
      },
      {
        id: 'feeds',
        title: t('quickAction.feedsTitle'),
        subtitle: t('quickAction.feedsSubtitle'),
        icon: 'bookmark',
        params: { href: '/feeds' },
      },
    ]);
  }, [appLocale, t]);

  useQuickActionCallback((action) => {
    const tab = tabFromQuickAction(action);
    if (tab) navigateToTab(tab);
  });

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationData(
        response.notification.request.content.data as Record<string, unknown> | undefined,
      );
    });

    void Notifications.getLastNotificationResponseAsync().then((last) => {
      if (last) {
        handleNotificationData(
          last.notification.request.content.data as Record<string, unknown> | undefined,
        );
      }
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Linking.addEventListener('url', ({ url }) => handleIncomingURL(url));
    void Linking.getInitialURL().then((url) => {
      if (url) handleIncomingURL(url);
    });
    return () => sub.remove();
  }, []);

  return null;
}
