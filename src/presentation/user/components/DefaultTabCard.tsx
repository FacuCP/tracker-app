import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { container } from '../../../core/di/container';
import { theme } from '../../../core/theme';
import { DEFAULT_HUB_TAB, HubTab } from '../../../domain/user/entities/UserProfile';

const OPTIONS: { tab: HubTab; label: string }[] = [
  { tab: 'Trackers', label: 'Trackers' },
  { tab: 'Lists', label: 'Listas' },
  { tab: 'Finances', label: 'Finanzas' },
];

/** Card de Ajustes para elegir qué pestaña se muestra al abrir la app. */
export function DefaultTabCard() {
  const [tab, setTab] = useState<HubTab>(DEFAULT_HUB_TAB);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    container.getUserProfile.execute().then((profile) => {
      setTab(profile?.defaultTab ?? DEFAULT_HUB_TAB);
      setLoaded(true);
    });
  }, []);

  async function choose(next: HubTab) {
    if (next === tab) return;
    setTab(next);
    setSaved(false);
    await container.updateUserProfile.execute({ defaultTab: next });
    setSaved(true);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Pestaña de inicio</Text>
      <Text style={styles.hint}>Es la que se muestra al abrir la app.</Text>

      {loaded ? (
        <View style={styles.options}>
          {OPTIONS.map((option) => {
            const active = option.tab === tab;
            return (
              <TouchableOpacity
                key={option.tab}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => choose(option.tab)}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <ActivityIndicator />
      )}

      {saved ? <Text style={styles.savedText}>Guardado</Text> : null}
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
  options: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  option: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  optionActive: {
    borderColor: theme.colors.accent,
    backgroundColor: '#eff6ff',
  },
  optionText: {
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  optionTextActive: {
    color: '#1e3a8a',
  },
  savedText: {
    color: '#16a34a',
    fontWeight: '600',
    fontSize: 13,
  },
});
