import { Platform, useWindowDimensions } from 'react-native';

/**
 * Heuristics for iPhone Duo chrome (vertical bars on the side).
 * Apple moves system tab/tool bars vertically on:
 * - outer display (closed): squat portrait ~5.4″
 * - inner display (open): landscape book layout
 *
 * Native UITabBarController (React Navigation native bottom tabs) gets this
 * automatically when built with iOS 27.1 SDK. These helpers are for layout
 * that still needs to respect asymmetric safe areas / ad placement.
 */

/** Outer Duo-like: taller than wide but "squat" vs classic phones (~0.46). */
export function isDuoOuterLikeAspect(width: number, height: number): boolean {
  if (width >= height) return false;
  const ratio = width / height;
  return ratio >= 0.58 && ratio <= 0.78;
}

/** Inner Duo open: landscape book (~1.4). */
export function isDuoInnerOpenLikeAspect(width: number, height: number): boolean {
  if (height >= width) return false;
  const ratio = width / height;
  return ratio >= 1.2 && ratio <= 1.6;
}

export function shouldExpectVerticalSystemBars(width: number, height: number): boolean {
  if (Platform.OS !== 'ios') return false;
  return isDuoOuterLikeAspect(width, height) || isDuoInnerOpenLikeAspect(width, height);
}

/** Hook: whether the current window likely uses Duo side chrome. */
export function useExpectsVerticalSystemBars(): boolean {
  const { width, height } = useWindowDimensions();
  return shouldExpectVerticalSystemBars(width, height);
}
