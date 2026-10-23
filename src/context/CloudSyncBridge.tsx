import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from './AuthContext';
import { useAppSettings } from './AppSettingsContext';
import { useFeeds } from './FeedsContext';
import { syncPushRegistration } from '../services/pushNotifications';
import {
  fetchCloudSync,
  mergeIdSets,
  mergeSubscriptions,
  replaceUserSubscriptions,
  upsertArticleStates,
  upsertUserProfile,
} from '../services/userSyncService';

const CLOUD_DEBOUNCE_MS = 2500;

/**
 * Pont auth ↔ état local : merge au login, upsert debouncé ensuite, enregistrement push.
 */
export function CloudSyncBridge() {
  const { user, ready } = useAuth();
  const {
    subscriptions,
    readIds,
    favoriteIds,
    hydrated: feedsHydrated,
    applyRemoteSync,
  } = useFeeds();
  const {
    commentPseudo,
    setCommentPseudo,
    pushDigestEnabled,
    setPushDigestEnabled,
  } = useAppSettings();

  const syncingDown = useRef(false);
  const lastUserId = useRef<string | null>(null);
  const pulling = useRef(false);
  const cloudReadyRef = useRef(false);
  const uploadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cloudReady, setCloudReady] = useState(false);

  // Pull + merge au login (attendre l’hydratation locale)
  useEffect(() => {
    if (!ready || !feedsHydrated) return;
    const userId = user?.id ?? null;

    if (!userId) {
      lastUserId.current = null;
      pulling.current = false;
      cloudReadyRef.current = false;
      setCloudReady(false);
      return;
    }

    if (lastUserId.current === userId && (cloudReadyRef.current || pulling.current)) return;
    lastUserId.current = userId;
    pulling.current = true;
    cloudReadyRef.current = false;
    setCloudReady(false);

    let cancelled = false;
    void (async () => {
      syncingDown.current = true;
      try {
        const cloud = await fetchCloudSync(userId);
        if (cancelled) return;

        const mergedSubs = mergeSubscriptions(subscriptions, cloud.subscriptions);
        const mergedRead = mergeIdSets([...readIds], cloud.readIds);
        const mergedFav = mergeIdSets([...favoriteIds], cloud.favoriteIds);

        await applyRemoteSync({
          subscriptions: mergedSubs,
          readIds: mergedRead,
          favoriteIds: mergedFav,
        });

        if (cloud.profile.commentPseudo && !commentPseudo) {
          await setCommentPseudo(cloud.profile.commentPseudo);
        } else if (commentPseudo && commentPseudo !== cloud.profile.commentPseudo) {
          await upsertUserProfile(userId, { commentPseudo });
        }

        await setPushDigestEnabled(cloud.profile.pushDigestEnabled);

        await replaceUserSubscriptions(userId, mergedSubs);
        await upsertArticleStates(userId, mergedRead, mergedFav);
        await upsertUserProfile(userId, {
          commentPseudo: commentPseudo || cloud.profile.commentPseudo,
          pushDigestEnabled: cloud.profile.pushDigestEnabled,
        });

        cloudReadyRef.current = true;
        setCloudReady(true);

        if (cloud.profile.pushDigestEnabled) {
          await syncPushRegistration(userId).catch(() => undefined);
        }
      } catch {
        cloudReadyRef.current = true;
        setCloudReady(true);
        if (pushDigestEnabled) {
          await syncPushRegistration(userId).catch(() => undefined);
        }
      } finally {
        pulling.current = false;
        syncingDown.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally only on auth + local hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, feedsHydrated, user?.id]);

  // Debounced upload of feeds / read / favorites
  useEffect(() => {
    if (!user?.id || !cloudReady || syncingDown.current) return;

    if (uploadTimer.current) clearTimeout(uploadTimer.current);
    uploadTimer.current = setTimeout(() => {
      void (async () => {
        try {
          await replaceUserSubscriptions(user.id, subscriptions);
          await upsertArticleStates(user.id, [...readIds], [...favoriteIds]);
        } catch {
          /* ignore transient */
        }
      })();
    }, CLOUD_DEBOUNCE_MS);

    return () => {
      if (uploadTimer.current) clearTimeout(uploadTimer.current);
    };
  }, [user?.id, cloudReady, subscriptions, readIds, favoriteIds]);

  // Profile fields
  useEffect(() => {
    if (!user?.id || !cloudReady || syncingDown.current) return;
    void upsertUserProfile(user.id, {
      commentPseudo,
      pushDigestEnabled,
    }).catch(() => undefined);
  }, [user?.id, cloudReady, commentPseudo, pushDigestEnabled]);

  // Push token : après sync cloud, si le toggle change, et au retour au premier plan
  useEffect(() => {
    if (!user?.id || !cloudReady) return;
    if (!pushDigestEnabled) return;
    void syncPushRegistration(user.id).catch(() => undefined);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void syncPushRegistration(user.id).catch(() => undefined);
      }
    });
    return () => sub.remove();
  }, [user?.id, cloudReady, pushDigestEnabled]);

  return null;
}
