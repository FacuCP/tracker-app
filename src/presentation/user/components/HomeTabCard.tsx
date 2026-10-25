import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { container } from '../../../core/di/container';
import { theme } from '../../../core/theme';
import { DEFAULT_HOME_TAB, HomeTab } from '../../../domain/user/entities/UserProfile';
import { SelectField, SelectOption } from '../../components/SelectField';

const HOME_TAB_OPTIONS: readonly SelectOption<HomeTab>[] = [
  { key: 'favorites', label: 'Favoritos' },
  { key: 'trackers', label: 'Trackers' },
  { key: 'lists', label: 'Listas' },
  { key: 'finances', label: 'Finanzas' },
  { key: 'gym', label: 'Gimnasio' },
  { key: 'events', label: 'Eventos' },
];

/** Card de Ajustes para elegir qué pestaña se abre al iniciar la app. */
export function HomeTabCard() {
  const [homeTab, setHomeTab] = useState<HomeTab>(DEFAULT_HOME_TAB);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    container.getUserProfile.execute().then((profile) => {
      setHomeTab(profile?.homeTab ?? DEFAULT_HOME_TAB);
      setLoaded(true);
    });
  }, []);

  async function change(value: HomeTab) {
    setHomeTab(value);
    await container.updateUserProfile.execute({ homeTab: value });
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Pestaña al abrir la app</Text>
      {loaded ? (
        <SelectField value={homeTab} options={HOME_TAB_OPTIONS} onChange={change} />
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
});
