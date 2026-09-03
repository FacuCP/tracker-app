import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { container } from '../../../core/di/container';
import { setAppFontScale } from '../../../core/text/textScale';
import { theme } from '../../../core/theme';
import {
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  FONT_SCALE_STEP,
  clampFontScale,
} from '../../../domain/user/entities/UserProfile';

/** Card de Ajustes para cambiar el tamaño de la letra de toda la app. */
export function FontSizeCard() {
  const [scale, setScale] = useState(1);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    container.getUserProfile.execute().then((profile) => {
      setScale(profile?.fontScale ?? 1);
      setLoaded(true);
    });
  }, []);

  async function change(next: number) {
    const clamped = clampFontScale(next);
    if (clamped === scale) return;
    setScale(clamped);
    setAppFontScale(clamped);
    await container.updateUserProfile.execute({ fontScale: clamped });
  }

  const atMin = scale <= FONT_SCALE_MIN;
  const atMax = scale >= FONT_SCALE_MAX;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Tamaño de la letra</Text>
      <Text style={styles.hint}>Afecta a toda la app. De 100 % a 150 %, de a 10 %.</Text>

      {loaded ? (
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.button, atMin && styles.disabled]}
            onPress={() => change(scale - FONT_SCALE_STEP)}
            disabled={atMin}
          >
            <Text style={styles.buttonText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.value}>{Math.round(scale * 100)} %</Text>
          <TouchableOpacity
            style={[styles.button, atMax && styles.disabled]}
            onPress={() => change(scale + FONT_SCALE_STEP)}
            disabled={atMax}
          >
            <Text style={styles.buttonText}>＋</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ActivityIndicator />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
  },
  hint: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 2,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.accent,
  },
  disabled: {
    opacity: 0.35,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    minWidth: 80,
    textAlign: 'center',
  },
});
