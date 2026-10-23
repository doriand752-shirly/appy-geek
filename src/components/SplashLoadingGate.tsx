import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus, StyleSheet, View } from 'react-native';

import { useAppSettings } from '../context/AppSettingsContext';
import { useFeeds } from '../context/FeedsContext';

import { SplashLoadingOverlay } from './SplashLoadingOverlay';

const SPLASH_MAX_MS = 5000;
const TICK_MS = 40;
const DISMISS_DELAY_MS = 180;
const MIN_SHOW_BEFORE_READY_MS = 350;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

type SplashLoadingGateProps = {
  children: React.ReactNode;
};

export function SplashLoadingGate({ children }: SplashLoadingGateProps) {
  const { hydrated: settingsHydrated, palette } = useAppSettings();
  const { hydrated: feedsHydrated, fetching, fetchProgress, initialFetchDone, refresh } =
    useFeeds();
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const sessionRef = useRef(0);
  const cleanupRef = useRef<(() => void) | null>(null);

  const fetchingRef = useRef(fetching);
  fetchingRef.current = fetching;
  const fetchProgressRef = useRef(fetchProgress);
  fetchProgressRef.current = fetchProgress;
  const settingsHydratedRef = useRef(settingsHydrated);
  settingsHydratedRef.current = settingsHydrated;
  const feedsHydratedRef = useRef(feedsHydrated);
  feedsHydratedRef.current = feedsHydrated;
  const initialFetchDoneRef = useRef(initialFetchDone);
  initialFetchDoneRef.current = initialFetchDone;

  const feedsReady = useCallback(() => {
    return (
      settingsHydratedRef.current &&
      feedsHydratedRef.current &&
      !fetchingRef.current &&
      initialFetchDoneRef.current
    );
  }, []);

  const beginSession = useCallback(() => {
    cleanupRef.current?.();
    sessionRef.current += 1;
    const session = sessionRef.current;
    setVisible(true);
    setProgress(0);

    const startedAt = Date.now();
    let dismissed = false;

    const dismiss = () => {
      if (dismissed || session !== sessionRef.current) return;
      dismissed = true;
      setProgress(1);
      setTimeout(() => {
        if (session === sessionRef.current) setVisible(false);
      }, DISMISS_DELAY_MS);
    };

    const tick = setInterval(() => {
      if (session !== sessionRef.current) return;

      const elapsed = Date.now() - startedAt;
      const timeRatio = Math.min(elapsed / SPLASH_MAX_MS, 1);
      const timeProgress = easeOutCubic(timeRatio) * 0.9;
      const feedProg = fetchProgressRef.current;

      if (feedsReady() && elapsed >= MIN_SHOW_BEFORE_READY_MS) {
        setProgress((prev) => Math.min(1, Math.max(prev, feedProg, 0.98)));
        dismiss();
        return;
      }

      const blended = Math.max(feedProg, timeProgress);
      setProgress(Math.min(0.95, blended));

      if (elapsed >= SPLASH_MAX_MS) dismiss();
    }, TICK_MS);

    const maxTimer = setTimeout(dismiss, SPLASH_MAX_MS);

    const cleanup = () => {
      clearInterval(tick);
      clearTimeout(maxTimer);
    };
    cleanupRef.current = cleanup;
    return cleanup;
  }, [feedsReady]);

  useEffect(() => {
    const cleanup = beginSession();
    return cleanup;
  }, [beginSession]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (next === 'active' && (prev === 'background' || prev === 'inactive')) {
        void refresh({ background: true });
      }
    });
    return () => sub.remove();
  }, [refresh]);

  useEffect(() => () => cleanupRef.current?.(), []);

  return (
    <View style={styles.root}>
      {children}
      <SplashLoadingOverlay visible={visible} progress={progress} palette={palette} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
