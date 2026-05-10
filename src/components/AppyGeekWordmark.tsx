import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { AppPalette } from '../constants/theme';
import { typography } from '../constants/theme';

type AppyGeekWordmarkProps = {
  palette: AppPalette;
};

/** Titre « Appy » en neutre + « Geek » en accent (couleur du thème visuel). */
export const AppyGeekWordmark = memo(function AppyGeekWordmark({
  palette,
}: AppyGeekWordmarkProps) {
  return (
    <View style={styles.row}>
      <Text style={[styles.base, { color: palette.text }]}>
        Appy <Text style={[styles.geek, { color: palette.accent }]}>Geek</Text>
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  base: { ...typography.title },
  geek: { fontWeight: '800' },
});
