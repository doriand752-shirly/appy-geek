import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { registerPushToken } from './userSyncService';

const WELCOME_KEY = 'appigeek_digest_welcome_token';

export type PushRegistrationResult = {
  token: string | null;
  error: 'not_device' | 'no_project' | 'permission' | 'token' | 'save' | null;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensureNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('digest', {
      name: 'Nouveaux articles',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    status = asked.status;
  }
  return status === 'granted';
}

export async function getExpoPushTokenString(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const projectId =
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  if (!projectId) return null;

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data || null;
  } catch {
    return null;
  }
}

async function sendWelcomePush(token: string, force = false): Promise<void> {
  if (!force) {
    try {
      const seen = await AsyncStorage.getItem(WELCOME_KEY);
      if (seen === token) return;
    } catch {
      /* continue */
    }
  }

  let delivered = false;
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        sound: 'default',
        title: 'Appigeek',
        body: force
          ? 'Test réussi — alertes à 8 h, 13 h et 18 h (Paris).'
          : 'Alertes activées — digests à 8 h et 13 h, rappel à 18 h (Paris).',
        data: { screen: 'Accueil' },
      }),
    });
    delivered = res.ok;
  } catch {
    delivered = false;
  }

  if (!delivered) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Appigeek',
          body: force
            ? 'Test local OK — vérifiez aussi Réglages iOS → Notifications.'
            : 'Alertes activées — digests à 8 h et 13 h, rappel à 18 h (Paris).',
          sound: true,
        },
        trigger: null,
      });
      delivered = true;
    } catch {
      delivered = false;
    }
  }

  if (delivered && !force) {
    try {
      await AsyncStorage.setItem(WELCOME_KEY, token);
    } catch {
      /* ignore */
    }
  }
}

/** Demande la permission et enregistre le token côté Supabase. */
export async function syncPushRegistration(
  userId: string,
  opts?: { forceWelcome?: boolean },
): Promise<string | null> {
  const result = await syncPushRegistrationDetailed(userId, opts);
  return result.token;
}

export async function syncPushRegistrationDetailed(
  userId: string,
  opts?: { forceWelcome?: boolean },
): Promise<PushRegistrationResult> {
  if (!Device.isDevice) return { token: null, error: 'not_device' };

  const projectId =
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  if (!projectId) return { token: null, error: 'no_project' };

  const granted = await ensureNotificationPermissions();
  if (!granted) return { token: null, error: 'permission' };

  const token = await getExpoPushTokenString();
  if (!token) return { token: null, error: 'token' };

  try {
    await registerPushToken(userId, token, Platform.OS);
  } catch {
    return { token: null, error: 'save' };
  }

  await sendWelcomePush(token, opts?.forceWelcome === true);
  return { token, error: null };
}
