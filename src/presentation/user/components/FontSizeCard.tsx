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

/**
 * Card de Ajustes para cambiar el tamaño de la letra de toda la app. Los − / +
 * ajustan un valor pendiente; el cambio se aplica al tocar "Aplicar".
 *
 * NO está montada por ahora (el swap de `Text` de `core/text/textScale.ts` no
 * funcionó bien). Se deja para retomar más adelante: para reactivarla, volver a
 * importar `textScale` en `App.tsx`, renderizar esta card en `SettingsScreen` y
 * fijar la escala al arrancar en `AppNavigator`.
 */
export function FontSizeCard() {
  const [saved, setSaved] = useState(1);
  const [pending, setPending] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    container.getUserProfile.execute().then((profile) => {
      const value = profile?.fontScale ?? 1;
      setSaved(value);
      setPending(value);
      setLoaded(true);
    });
  }, []);

  async function apply() {
    if (pending === saved) return;
    setSaving(true);
    setAppFontScale(pending);
    await container.updateUserProfile.execute({ fontScale: pending });
    setSaved(pending);
    setSaving(false);
  }

  const atMin = pending <= FONT_SCALE_MIN;
  const atMax = pending >= FONT_SCALE_MAX;
  const dirty = pending !== saved;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Tamaño de la letra</Text>
      <Text style={styles.hint}>Afecta a toda la app. De 100 % a 150 %, de a 10 %.</Text>

      {loaded ? (
        <>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.button, atMin && styles.disabled]}
              onPress={() => setPending((p) => clampFontScale(p - FONT_SCALE_STEP))}
              disabled={atMin}
            >
              <Text style={styles.buttonText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.value}>{Math.round(pending * 100)} %</Text>
            <TouchableOpacity
              style={[styles.button, atMax && styles.disabled]}
              onPress={() => setPending((p) => clampFontScale(p + FONT_SCALE_STEP))}
              disabled={atMax}
            >
              <Text style={styles.buttonText}>＋</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.apply, (!dirty || saving) && styles.disabled]}
            onPress={apply}
            disabled={!dirty || saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.applyText}>Aplicar</Text>
            )}
          </TouchableOpacity>
        </>
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
    gap: 12,
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
  apply: {
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  applyText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
});
