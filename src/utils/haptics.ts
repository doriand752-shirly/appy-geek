import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Light tactile feedback for toggles, swipes, and selection. No-op on web. */
export function hapticLight(): void {
  if (Platform.OS === 'web') return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}
