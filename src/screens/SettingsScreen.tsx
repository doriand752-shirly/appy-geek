import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppigeekLogoMark } from '../components/AppigeekLogo';
import { BRAND } from '../constants/brand';
import { ALL_THEME_IDS } from '../constants/newsThemes';
import type { AppPalette } from '../constants/theme';
import { spacing, typography } from '../constants/theme';
import { VISUAL_THEME_OPTIONS } from '../constants/visualThemes';
import { useAppSettings } from '../context/AppSettingsContext';
import { LANGUAGE_OPTIONS, translate, useTranslation } from '../i18n';
import type { AppLocale } from '../i18n/types';
import { useAuth } from '../context/AuthContext';
import { useFeeds } from '../context/FeedsContext';
import { deleteMyAccount } from '../services/accountDeletionService';
import { syncPushRegistrationDetailed } from '../services/pushNotifications';
import { checkIsAppAdmin } from '../services/adminService';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { RootTabParamList } from '../navigation/RootTabs';
import type { OfflineCacheCount, ReaderDefaultView, ReaderFontSize } from '../types/settings';
import {
  OFFLINE_CACHE_COUNT_OPTIONS,
  READER_FONT_SIZE_OPTIONS,
} from '../types/settings';
import { clearOfflineCache } from '../utils/offlineCache';
import { clearArticlesListCache } from '../utils/articlesListCache';
import { readerFontSizeTranslationKey } from '../utils/commentCountLabel';
import { getVisualThemeLabel } from '../utils/visualThemeLabel';
import type { VisualThemeId } from '../constants/visualThemes';
import {
  COMMENT_PSEUDO_MAX,
  COMMENT_PSEUDO_MIN,
  isValidCommentPseudo,
  sanitizeCommentPseudo,
} from '../utils/commentIdentity';

/** Une fois le geste secret validé, on garde un raccourci Admin (par appareil). */
const ADMIN_UNLOCKED_KEY = 'appigeek_admin_unlocked_v1';

export function SettingsScreen() {
  const {
    readerDefaultView,
    setReaderDefaultView,
    readerFontSize,
    setReaderFontSize,
    offlineCacheEnabled,
    offlineCacheLimit,
    setOfflineCacheEnabled,
    setOfflineCacheLimit,
    selectedThemeIds,
    customThemes,
    palette,
    visualThemeId,
    setVisualThemeId,
    commentPseudo,
    setCommentPseudo,
    pushDigestEnabled,
    setPushDigestEnabled,
    appLocale,
    setAppLocale,
  } = useAppSettings();
  const { t } = useTranslation();
  const { articles, refresh, offlineSyncing, offlineCachedCount, syncOfflineNow, switchLocaleFeeds } = useFeeds();
  const {
    configured: authConfigured,
    user,
    appleAvailable,
    signingIn,
    signInWithApple,
    signOut,
  } = useAuth();
  const styles = useMemo(() => createSettingsStyles(palette), [palette]);
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList, 'Paramètres'>>();
  const [limitPickerVisible, setLimitPickerVisible] = useState(false);
  const [localePickerVisible, setLocalePickerVisible] = useState(false);
  const [themePickerVisible, setThemePickerVisible] = useState(false);
  const [fontPickerVisible, setFontPickerVisible] = useState(false);
  const [syncingManual, setSyncingManual] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [pseudoDraft, setPseudoDraft] = useState(commentPseudo);
  const [adminTapCount, setAdminTapCount] = useState(0);
  const [adminChecking, setAdminChecking] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  useEffect(() => {
    setPseudoDraft(commentPseudo);
  }, [commentPseudo]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(ADMIN_UNLOCKED_KEY);
        if (!cancelled && raw === '1') setAdminUnlocked(true);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stackNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();

  const openThemePicker = useCallback(() => {
    stackNav?.navigate('ThemePicker');
  }, [stackNav]);

  const openOfflineList = useCallback(() => {
    stackNav?.navigate('OfflineArticles');
  }, [stackNav]);

  const persistAdminUnlocked = useCallback(async () => {
    setAdminUnlocked(true);
    try {
      await AsyncStorage.setItem(ADMIN_UNLOCKED_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  const tryOpenAdmin = useCallback(async () => {
    if (adminChecking) return;
    if (!user) {
      Alert.alert(
        t('settings.loginRequired'),
        t('settings.adminLoginRequired'),
      );
      setAdminTapCount(0);
      return;
    }
    setAdminChecking(true);
    try {
      const ok = await checkIsAppAdmin();
      if (ok) {
        setAdminTapCount(0);
        await persistAdminUnlocked();
        stackNav?.navigate('Admin');
      } else {
        Alert.alert(t('common.error'), t('settings.adminDenied'));
        setAdminTapCount(0);
      }
    } catch {
      Alert.alert(t('common.error'), t('settings.adminCheckFailed'));
      setAdminTapCount(0);
    } finally {
      setAdminChecking(false);
    }
  }, [adminChecking, persistAdminUnlocked, stackNav, t, user]);

  const onBrandLongPress = useCallback(() => {
    if (adminUnlocked) {
      void tryOpenAdmin();
      return;
    }
    setAdminTapCount((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        void tryOpenAdmin();
        return 0;
      }
      return next;
    });
  }, [adminUnlocked, tryOpenAdmin]);

  useEffect(() => {
    if (adminTapCount === 0) return;
    const t = setTimeout(() => setAdminTapCount(0), 8000);
    return () => clearTimeout(t);
  }, [adminTapCount]);

  const applyOfflineLimit = useCallback(
    async (limit: OfflineCacheCount) => {
      setLimitPickerVisible(false);
      await setOfflineCacheLimit(limit);
      if (offlineCacheEnabled && articles.length > 0) {
        setSyncingManual(true);
        try {
          const count = await syncOfflineNow();
          if (count === 0) {
            Alert.alert(t('settings.noOfflineSaved'), t('settings.noOfflineSavedHint'));
          }
        } finally {
          setSyncingManual(false);
        }
      }
    },
    [articles, offlineCacheEnabled, setOfflineCacheLimit, syncOfflineNow],
  );

  const pickOfflineLimit = useCallback(() => {
    if (Platform.OS === 'ios') {
      const labels = OFFLINE_CACHE_COUNT_OPTIONS.map((n) =>
        t('settings.offlineLimit', { count: n }),
      );
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('common.cancel'), ...labels],
          cancelButtonIndex: 0,
          title: t('settings.offlineLimitTitle'),
        },
        (index) => {
          if (index > 0) void applyOfflineLimit(OFFLINE_CACHE_COUNT_OPTIONS[index - 1]);
        },
      );
    } else {
      setLimitPickerVisible(true);
    }
  }, [applyOfflineLimit, t]);

  const onLocaleChange = useCallback(
    (nextLocale: AppLocale) => {
      if (nextLocale === appLocale) return;
      const langLabel = LANGUAGE_OPTIONS.find((o) => o.id === nextLocale)?.label ?? nextLocale;
      Alert.alert(
        translate(nextLocale, 'settings.localeChangeTitle'),
        translate(nextLocale, 'settings.localeChangeMessage', { lang: langLabel }),
        [
          { text: translate(nextLocale, 'common.cancel'), style: 'cancel' },
          {
            text: translate(nextLocale, 'settings.localeChangeConfirm'),
            onPress: () => {
              void (async () => {
                await setAppLocale(nextLocale);
                await switchLocaleFeeds(nextLocale);
              })();
            },
          },
        ],
      );
    },
    [appLocale, setAppLocale, switchLocaleFeeds],
  );

  const currentLanguageLabel =
    LANGUAGE_OPTIONS.find((o) => o.id === appLocale)?.label ?? appLocale;

  const currentThemeLabel = getVisualThemeLabel(appLocale, visualThemeId as VisualThemeId);
  const currentFontLabel = t(readerFontSizeTranslationKey(readerFontSize));

  const pickVisualTheme = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            t('common.cancel'),
            ...VISUAL_THEME_OPTIONS.map((o) => getVisualThemeLabel(appLocale, o.id)),
          ],
          cancelButtonIndex: 0,
          title: t('settings.chooseTheme'),
        },
        (index) => {
          if (index > 0) void setVisualThemeId(VISUAL_THEME_OPTIONS[index - 1].id);
        },
      );
    } else {
      setThemePickerVisible(true);
    }
  }, [appLocale, setVisualThemeId, t]);

  const pickReaderFontSize = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            t('common.cancel'),
            ...READER_FONT_SIZE_OPTIONS.map((o) => t(readerFontSizeTranslationKey(o.id))),
          ],
          cancelButtonIndex: 0,
          title: t('settings.chooseFontSize'),
        },
        (index) => {
          if (index > 0) {
            void setReaderFontSize(READER_FONT_SIZE_OPTIONS[index - 1].id as ReaderFontSize);
          }
        },
      );
    } else {
      setFontPickerVisible(true);
    }
  }, [setReaderFontSize, t]);

  const pickLanguage = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('common.cancel'), ...LANGUAGE_OPTIONS.map((o) => o.label)],
          cancelButtonIndex: 0,
          title: t('settings.section.language'),
        },
        (index) => {
          if (index > 0) onLocaleChange(LANGUAGE_OPTIONS[index - 1].id);
        },
      );
    } else {
      setLocalePickerVisible(true);
    }
  }, [onLocaleChange, t]);

  const toggleOffline = useCallback(async () => {
    const next = !offlineCacheEnabled;
    await setOfflineCacheEnabled(next);
    if (!next) {
      await clearOfflineCache();
      return;
    }
    if (articles.length > 0) {
      setSyncingManual(true);
      try {
        await syncOfflineNow();
      } finally {
        setSyncingManual(false);
      }
    } else {
      void refresh();
    }
  }, [articles, offlineCacheEnabled, offlineCacheLimit, refresh, setOfflineCacheEnabled, syncOfflineNow]);

  const clearLocalCaches = useCallback(() => {
    Alert.alert(t('settings.clearCacheTitle'), t('settings.clearCacheMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.clearAndRefresh'),
        style: 'destructive',
          onPress: () => {
            void (async () => {
              setSyncingManual(true);
              try {
                await clearOfflineCache();
                await clearArticlesListCache();
                await refresh();
              } finally {
                setSyncingManual(false);
              }
            })();
          },
        },
      ],
    );
  }, [refresh]);

  const handleAppleSignIn = useCallback(() => {
    void (async () => {
      setAuthBusy(true);
      try {
        await signInWithApple();
      } catch (e) {
        const msg = e instanceof Error ? e.message : t('settings.signInFailed');
        if (!/cancel/i.test(msg)) Alert.alert(t('settings.appleSignIn'), msg);
      } finally {
        setAuthBusy(false);
      }
    })();
  }, [signInWithApple, t]);

  const handleSignOut = useCallback(() => {
    Alert.alert(t('settings.signOutTitle'), t('settings.signOutMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.signOut'),
        style: 'destructive',
        onPress: () => {
          void signOut().catch(() => Alert.alert(t('common.error'), t('settings.signOutFailed')));
        },
      },
    ]);
  }, [signOut, t]);

  const PRIVACY_URL = 'https://doriand752-shirly.github.io/appy-geek/privacy.html';

  const openPrivacy = useCallback(() => {
    void Linking.openURL(PRIVACY_URL).catch(() =>
      Alert.alert(t('common.error'), PRIVACY_URL),
    );
  }, [t]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(t('settings.deleteAccountTitle'), t('settings.deleteAccountMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.deleteAccountConfirm'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setAuthBusy(true);
            try {
              await deleteMyAccount();
            } catch (e) {
              Alert.alert(
                t('settings.deleteAccountFailed'),
                e instanceof Error ? e.message : t('settings.deleteAccountFailed'),
              );
            } finally {
              setAuthBusy(false);
            }
          })();
        },
      },
    ]);
  }, [t]);

  const explainPushError = useCallback((error: string | null) => {
    switch (error) {
      case 'permission':
        return t('settings.pushPermission');
      case 'token':
        return t('settings.pushToken');
      case 'save':
        return t('settings.pushSave');
      case 'no_project':
        return t('settings.pushNoProject');
      case 'not_device':
        return t('settings.pushNotDevice');
      default:
        return t('settings.pushGenericError');
    }
  }, [t]);

  const registerPushNow = useCallback(
    async (forceWelcome: boolean) => {
      if (!user) return false;
      const result = await syncPushRegistrationDetailed(user.id, { forceWelcome });
      if (!result.token) {
        Alert.alert(t('settings.pushAlertsMenu'), explainPushError(result.error), [
          { text: t('common.ok') },
          ...(result.error === 'permission'
            ? [{ text: t('settings.openSettings'), onPress: () => void Linking.openSettings() }]
            : []),
        ]);
        return false;
      }
      if (forceWelcome) {
        Alert.alert(t('settings.pushTestSent'), t('settings.pushTestSentHint'));
      }
      return true;
    },
    [user, explainPushError, t],
  );

  // Dès l’ouverture des Paramètres : réenregistrer le token si les alertes sont censées être actives
  useFocusEffect(
    useCallback(() => {
      if (!user?.id || !pushDigestEnabled) return;
      void syncPushRegistrationDetailed(user.id).catch(() => undefined);
    }, [user?.id, pushDigestEnabled]),
  );

  const togglePushDigest = useCallback(async () => {
    if (!user) {
      Alert.alert(t('settings.loginRequired'), t('settings.pushNeedSignIn'));
      return;
    }

    // Déjà activé : ne pas couper par erreur — proposer test ou désactivation
    if (pushDigestEnabled) {
      const runTest = () => {
        void registerPushNow(true);
      };
      const disable = () => {
        void setPushDigestEnabled(false);
      };
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: [t('common.cancel'), t('settings.pushTest'), t('settings.pushDisable')],
            destructiveButtonIndex: 2,
            cancelButtonIndex: 0,
          },
          (idx) => {
            if (idx === 1) runTest();
            if (idx === 2) disable();
          },
        );
      } else {
        Alert.alert(t('settings.pushAlertsMenu'), undefined, [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('settings.pushTest'), onPress: runTest },
          { text: t('settings.pushDisable'), style: 'destructive', onPress: disable },
        ]);
      }
      return;
    }

    await setPushDigestEnabled(true);
    try {
      const result = await syncPushRegistrationDetailed(user.id, { forceWelcome: true });
      if (!result.token) {
        await setPushDigestEnabled(false);
        Alert.alert(t('settings.pushAlertsMenu'), explainPushError(result.error), [
          { text: t('common.ok') },
          ...(result.error === 'permission'
            ? [{ text: t('settings.openSettings'), onPress: () => void Linking.openSettings() }]
            : []),
        ]);
        return;
      }
      Alert.alert(t('settings.pushActivated'), t('settings.pushActivatedHint'));
    } catch {
      await setPushDigestEnabled(false);
      Alert.alert(t('settings.pushAlertsMenu'), t('settings.pushRegisterFailed'));
    }
  }, [user, pushDigestEnabled, setPushDigestEnabled, registerPushNow, explainPushError, t]);

  const row = (
    value: ReaderDefaultView,
    label: string,
    hint: string,
    icon: 'document-text-outline' | 'newspaper-outline',
  ) => {
    const selected = readerDefaultView === value;
    return (
      <Pressable
        onPress={() => void setReaderDefaultView(value)}
        style={({ pressed }) => [
          styles.option,
          selected && styles.optionSelected,
          pressed && { opacity: 0.9 },
        ]}
      >
        <View style={styles.optionIconWrap}>
          <Ionicons name={icon} size={22} color={selected ? palette.accentMuted : palette.textMuted} />
        </View>
        <View style={styles.optionText}>
          <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>{label}</Text>
          <Text style={styles.optionHint}>{hint}</Text>
        </View>
        {selected ? (
          <Ionicons name="checkmark-circle" size={22} color={palette.accent} />
        ) : (
          <View style={styles.optionSpacer} />
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <Text style={styles.subtitle}>{t('settings.subtitle')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>{t('settings.section.account')}</Text>
        {authConfigured && Platform.OS === 'ios' && appleAvailable ? (
          <>
            <Pressable
              onPress={user ? handleSignOut : handleAppleSignIn}
              disabled={signingIn || authBusy}
              style={({ pressed }) => [
                styles.option,
                user && styles.optionSelected,
                pressed && { opacity: 0.9 },
                (signingIn || authBusy) && { opacity: 0.6 },
              ]}
            >
              <View style={styles.optionIconWrap}>
                <Ionicons
                  name="logo-apple"
                  size={22}
                  color={user ? palette.accentMuted : palette.textMuted}
                />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>
                  {user ? t('settings.appleSignedIn') : t('settings.appleSignIn')}
                </Text>
                <Text style={styles.optionHint}>
                  {user ? t('settings.appleHintSignedIn') : t('settings.appleHintSignIn')}
                </Text>
              </View>
              {signingIn || authBusy ? (
                <ActivityIndicator color={palette.accent} />
              ) : (
                <Ionicons
                  name={user ? 'log-out-outline' : 'chevron-forward'}
                  size={22}
                  color={palette.textMuted}
                />
              )}
            </Pressable>
            <Pressable
              onPress={() => void togglePushDigest()}
              style={({ pressed }) => [
                styles.option,
                pushDigestEnabled && user && styles.optionSelected,
                pressed && { opacity: 0.9 },
              ]}
            >
              <View style={styles.optionIconWrap}>
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color={pushDigestEnabled && user ? palette.accentMuted : palette.textMuted}
                />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{t('settings.pushAlerts')}</Text>
                <Text style={styles.optionHint}>
                  {user
                    ? pushDigestEnabled
                      ? t('settings.pushEnabled')
                      : t('settings.pushDisabled')
                    : t('settings.pushNeedSignIn')}
                </Text>
              </View>
              <Ionicons
                name={pushDigestEnabled && user ? 'toggle' : 'toggle-outline'}
                size={28}
                color={pushDigestEnabled && user ? palette.accent : palette.textMuted}
              />
            </Pressable>
          </>
        ) : (
          <View style={styles.option}>
            <View style={styles.optionIconWrap}>
              <Ionicons name="person-outline" size={22} color={palette.textMuted} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>{t('settings.appleAccount')}</Text>
              <Text style={styles.optionHint}>
                {!authConfigured
                  ? t('settings.appleUnavailable')
                  : Platform.OS !== 'ios'
                    ? t('settings.pushNotDevice')
                    : t('settings.appleUnavailable')}
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionLabel}>{t('settings.section.reading')}</Text>
        {row(
          'preview',
          t('settings.readerPreview'),
          t('settings.readerPreviewHint'),
          'document-text-outline',
        )}
        {row(
          'full',
          t('settings.readerFull'),
          t('settings.readerFullHint'),
          'newspaper-outline',
        )}

        <Text style={styles.sectionLabel}>{t('settings.fontSizeReader')}</Text>
        <Pressable
          onPress={pickReaderFontSize}
          style={({ pressed }) => [styles.option, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.optionIconWrap}>
            <Ionicons name="text-outline" size={22} color={palette.accentMuted} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>{t('settings.chooseFontSize')}</Text>
            <Text style={styles.optionHint}>
              {currentFontLabel}
              {' · '}
              {t('settings.fontSizeBodyPt', {
                size:
                  READER_FONT_SIZE_OPTIONS.find((o) => o.id === readerFontSize)?.bodySize ?? 16,
              })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={palette.textMuted} />
        </Pressable>

        <Text style={styles.sectionLabel}>{t('settings.section.appearance')}</Text>
        <Pressable
          onPress={pickVisualTheme}
          style={({ pressed }) => [styles.option, pressed && { opacity: 0.9 }]}
        >
          <View
            style={[
              styles.themeSwatch,
              {
                backgroundColor:
                  VISUAL_THEME_OPTIONS.find((o) => o.id === visualThemeId)?.palette.accent ??
                  palette.accent,
              },
            ]}
          />
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>{t('settings.chooseTheme')}</Text>
            <Text style={styles.optionHint}>{currentThemeLabel}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={palette.textMuted} />
        </Pressable>

        <Text style={styles.sectionLabel}>{t('settings.section.home')}</Text>
        <Pressable
          onPress={openThemePicker}
          style={({ pressed }) => [styles.option, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.optionIconWrap}>
            <Ionicons name="grid-outline" size={22} color={palette.accentMuted} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>{t('settings.homeThemes')}</Text>
            <Text style={styles.optionHint}>
              {selectedThemeIds.length === 0
                ? t('settings.homeThemesNone')
                : t('settings.homeThemesCount', {
                    count: selectedThemeIds.length,
                    total: ALL_THEME_IDS.length + customThemes.length,
                  })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={palette.textMuted} />
        </Pressable>

        <Text style={styles.sectionLabel}>{t('settings.section.offline')}</Text>
        <Pressable
          onPress={() => void toggleOffline()}
          style={({ pressed }) => [
            styles.option,
            offlineCacheEnabled && styles.optionSelected,
            pressed && { opacity: 0.9 },
          ]}
        >
          <View style={styles.optionIconWrap}>
            <Ionicons
              name="cloud-download-outline"
              size={22}
              color={offlineCacheEnabled ? palette.accentMuted : palette.textMuted}
            />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>{t('settings.offlineCache')}</Text>
            <Text style={styles.optionHint}>
              {offlineCacheEnabled
                ? t('settings.offlineCacheHintOn')
                : t('settings.offlineCacheHintOff')}
            </Text>
          </View>
          {offlineSyncing || syncingManual ? (
            <ActivityIndicator color={palette.accent} />
          ) : (
            <Ionicons
              name={offlineCacheEnabled ? 'toggle' : 'toggle-outline'}
              size={28}
              color={offlineCacheEnabled ? palette.accent : palette.textMuted}
            />
          )}
        </Pressable>

        {offlineCacheEnabled ? (
          <>
            <Pressable
              onPress={pickOfflineLimit}
              style={({ pressed }) => [styles.option, pressed && { opacity: 0.9 }]}
            >
              <View style={styles.optionIconWrap}>
                <Ionicons name="layers-outline" size={22} color={palette.accentMuted} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{t('settings.offlineLimitTitle')}</Text>
                <Text style={styles.optionHint}>
                  {t('settings.offlineLimit', { count: offlineCacheLimit })}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color={palette.textMuted} />
            </Pressable>
            <Pressable
              onPress={openOfflineList}
              style={({ pressed }) => [styles.option, pressed && { opacity: 0.9 }]}
            >
              <View style={styles.optionIconWrap}>
                <Ionicons name="folder-open-outline" size={22} color={palette.accentMuted} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{t('settings.offlineArticles')}</Text>
                <Text style={styles.optionHint}>{t('settings.offlineArticlesListHint')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={palette.textMuted} />
            </Pressable>
          </>
        ) : null}

        <Pressable
          onPress={clearLocalCaches}
          style={({ pressed }) => [styles.option, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.optionIconWrap}>
            <Ionicons name="trash-outline" size={22} color={palette.accentMuted} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>{t('settings.clearCache')}</Text>
            <Text style={styles.optionHint}>{t('settings.clearCacheMessage')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={palette.textMuted} />
        </Pressable>

        <Text style={styles.sectionLabel}>{t('settings.section.language')}</Text>
        <Pressable
          onPress={pickLanguage}
          style={({ pressed }) => [styles.option, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.optionIconWrap}>
            <Ionicons name="language-outline" size={22} color={palette.textMuted} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>{t('settings.section.language')}</Text>
            <Text style={styles.optionHint}>
              {currentLanguageLabel} · {t('settings.languageHint')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
        </Pressable>

        <Text style={styles.sectionLabel}>{t('settings.section.comments')}</Text>
        <View style={styles.option}>
          <View style={styles.optionIconWrap}>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color={palette.accentMuted} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>{t('settings.commentPseudo')}</Text>
            <Text style={styles.optionHint}>
              {t('settings.commentPseudoHint', {
                min: COMMENT_PSEUDO_MIN,
                max: COMMENT_PSEUDO_MAX,
              })}
            </Text>
            <TextInput
              value={pseudoDraft}
              onChangeText={setPseudoDraft}
              onBlur={() => {
                const next = sanitizeCommentPseudo(pseudoDraft);
                setPseudoDraft(next);
                if (next && isValidCommentPseudo(next)) {
                  void setCommentPseudo(next);
                }
              }}
              placeholder={t('comments.pseudoPlaceholder')}
              placeholderTextColor={palette.textMuted}
              maxLength={COMMENT_PSEUDO_MAX}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.pseudoField}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>{t('settings.privacy')}</Text>
        <Pressable
          onPress={openPrivacy}
          style={({ pressed }) => [styles.option, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.optionIconWrap}>
            <Ionicons name="document-text-outline" size={22} color={palette.textMuted} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>{t('settings.privacy')}</Text>
            <Text style={styles.optionHint}>{t('settings.privacyHint')}</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={palette.textMuted} />
        </Pressable>

        <Text style={styles.sectionLabel}>{t('settings.section.danger')}</Text>
        {authConfigured && Platform.OS === 'ios' && appleAvailable && user ? (
          <Pressable
            onPress={handleDeleteAccount}
            disabled={signingIn || authBusy}
            style={({ pressed }) => [
              styles.option,
              pressed && { opacity: 0.9 },
              (signingIn || authBusy) && { opacity: 0.6 },
            ]}
          >
            <View style={styles.optionIconWrap}>
              <Ionicons name="trash-outline" size={22} color="#e85d5d" />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>{t('settings.deleteAccount')}</Text>
              <Text style={styles.optionHint}>{t('settings.deleteAccountHint')}</Text>
            </View>
            {authBusy ? (
              <ActivityIndicator color={palette.accent} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
            )}
          </Pressable>
        ) : null}

        {adminUnlocked ? (
          <Pressable
            onPress={() => void tryOpenAdmin()}
            disabled={adminChecking}
            style={({ pressed }) => [styles.option, pressed && { opacity: 0.88 }]}
            accessibilityRole="button"
            accessibilityLabel={t('settings.adminOpen')}
          >
            <View style={styles.optionIconWrap}>
              <Ionicons name="shield-checkmark-outline" size={22} color={palette.accent} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>{t('settings.adminOpen')}</Text>
              <Text style={styles.optionHint}>{t('settings.adminUnlockedHint')}</Text>
            </View>
            {adminChecking ? (
              <ActivityIndicator color={palette.accent} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
            )}
          </Pressable>
        ) : null}

        <Pressable
          onLongPress={onBrandLongPress}
          delayLongPress={450}
          style={({ pressed }) => [styles.brandFooter, pressed && { opacity: 0.92 }]}
          accessibilityLabel="Appigeek"
        >
          <AppigeekLogoMark size={40} />
          <View style={styles.brandFooterText}>
            <Text style={[typography.subtitle, { color: palette.text }]}>{BRAND.name}</Text>
            <Text style={[typography.caption, { color: palette.textMuted, marginTop: 4 }]}>
              {t('brand.tagline')}
            </Text>
            <Text style={[typography.caption, { color: palette.textMuted, marginTop: 8, opacity: 0.85 }]}>
              {t('settings.version')}{' '}
              {typeof Constants.expoConfig?.version === 'string'
                ? Constants.expoConfig.version
                : '—'}
            </Text>
          </View>
        </Pressable>
      </ScrollView>

      <Modal
        visible={limitPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLimitPickerVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setLimitPickerVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('settings.offlineLimitTitle')}</Text>
            <ScrollView style={styles.modalScroll}>
              {OFFLINE_CACHE_COUNT_OPTIONS.map((n) => (
                <Pressable
                  key={n}
                  onPress={() => void applyOfflineLimit(n)}
                  style={({ pressed }) => [
                    styles.modalRow,
                    n === offlineCacheLimit && styles.modalRowSelected,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalRowText,
                      n === offlineCacheLimit && styles.modalRowTextSelected,
                    ]}
                  >
                    {t('settings.offlineLimit', { count: n })}
                    {n === 50 ? t('settings.offlineLimitDefault') : ''}
                  </Text>
                  {n === offlineCacheLimit ? (
                    <Ionicons name="checkmark" size={20} color={palette.accent} />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => setLimitPickerVisible(false)}
              style={({ pressed }) => [styles.modalCancel, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.modalCancelText}>{t('common.close')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={localePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLocalePickerVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setLocalePickerVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('settings.section.language')}</Text>
            <ScrollView style={styles.modalScroll}>
              {LANGUAGE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    setLocalePickerVisible(false);
                    onLocaleChange(opt.id);
                  }}
                  style={({ pressed }) => [
                    styles.modalRow,
                    opt.id === appLocale && styles.modalRowSelected,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalRowText,
                      opt.id === appLocale && styles.modalRowTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {opt.id === appLocale ? (
                    <Ionicons name="checkmark" size={20} color={palette.accent} />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => setLocalePickerVisible(false)}
              style={({ pressed }) => [styles.modalCancel, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={themePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setThemePickerVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setThemePickerVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('settings.chooseTheme')}</Text>
            <ScrollView style={styles.modalScroll}>
              {VISUAL_THEME_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    setThemePickerVisible(false);
                    void setVisualThemeId(opt.id);
                  }}
                  style={({ pressed }) => [
                    styles.modalRow,
                    opt.id === visualThemeId && styles.modalRowSelected,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <View style={[styles.themeSwatch, { backgroundColor: opt.palette.accent }]} />
                  <Text
                    style={[
                      styles.modalRowText,
                      opt.id === visualThemeId && styles.modalRowTextSelected,
                      { flex: 1 },
                    ]}
                  >
                    {getVisualThemeLabel(appLocale, opt.id)}
                  </Text>
                  {opt.id === visualThemeId ? (
                    <Ionicons name="checkmark" size={20} color={palette.accent} />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => setThemePickerVisible(false)}
              style={({ pressed }) => [styles.modalCancel, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={fontPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFontPickerVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setFontPickerVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('settings.chooseFontSize')}</Text>
            <ScrollView style={styles.modalScroll}>
              {READER_FONT_SIZE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    setFontPickerVisible(false);
                    void setReaderFontSize(opt.id as ReaderFontSize);
                  }}
                  style={({ pressed }) => [
                    styles.modalRow,
                    opt.id === readerFontSize && styles.modalRowSelected,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalRowText,
                      opt.id === readerFontSize && styles.modalRowTextSelected,
                    ]}
                  >
                    {t(readerFontSizeTranslationKey(opt.id))} ·{' '}
                    {t('settings.fontSizeBodyPt', { size: opt.bodySize })}
                  </Text>
                  {opt.id === readerFontSize ? (
                    <Ionicons name="checkmark" size={20} color={palette.accent} />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => setFontPickerVisible(false)}
              style={({ pressed }) => [styles.modalCancel, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function createSettingsStyles(palette: AppPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: palette.bg },
    header: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
    title: { ...typography.title, color: palette.text, marginBottom: spacing.xs },
    subtitle: { ...typography.caption, color: palette.textMuted, lineHeight: 20 },
    scroll: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
    sectionLabel: {
      ...typography.caption,
      color: palette.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: spacing.sm,
      marginTop: spacing.sm,
    },
    themeSwatch: {
      width: 28,
      height: 28,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
      backgroundColor: palette.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
    },
    optionSelected: {
      borderColor: palette.accent,
      backgroundColor: palette.surfaceSelected,
    },
    optionIconWrap: { width: 28, alignItems: 'center' },
    optionText: { flex: 1 },
    optionTitle: { ...typography.subtitle, color: palette.text, marginBottom: 4 },
    optionTitleSelected: { color: palette.text },
    optionHint: { ...typography.caption, color: palette.textMuted, lineHeight: 18 },
    pseudoField: {
      marginTop: spacing.sm,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 10,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: palette.text,
      backgroundColor: palette.surface,
      ...typography.body,
    },
    optionSpacer: { width: 22 },
    brandFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.xl,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
      borderRadius: 14,
      backgroundColor: palette.surfaceElevated,
      borderWidth: 1,
      borderColor: palette.border,
    },
    brandFooterText: { flex: 1 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: palette.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
      maxHeight: '70%',
    },
    modalTitle: {
      ...typography.subtitle,
      color: palette.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    modalScroll: { maxHeight: 360 },
    modalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.border,
    },
    modalRowSelected: { backgroundColor: palette.surfaceSelected },
    modalRowText: { ...typography.body, color: palette.text },
    modalRowTextSelected: { color: palette.accent, fontWeight: '600' as const },
    modalCancel: {
      marginTop: spacing.md,
      marginHorizontal: spacing.md,
      padding: spacing.md,
      alignItems: 'center',
      borderRadius: 12,
      backgroundColor: palette.surfaceElevated,
    },
    modalCancelText: { ...typography.subtitle, color: palette.accent },
  });
}
