import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLayoutEffect } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '../../../core/navigation/types';
import { theme } from '../../../core/theme';
import { MoodTrackerCard } from '../../mood/components/MoodTrackerCard';
import { HubMenuButton } from '../../navigation/HubMenuButton';
import { CreateTrackerButton } from '../../tracker/components/CreateTrackerButton';
import { TrackerCard } from '../../tracker/components/TrackerCard';
import { useTrackersViewModel } from './useTrackersViewModel';

type Props = NativeStackScreenProps<RootStackParamList, 'Trackers'>;

export function TrackersScreen({ navigation }: Props) {
  const { greeting, trackers } = useTrackersViewModel();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HubMenuButton current="Trackers" />,
      headerRight: () => (
        <Text style={styles.headerLink} onPress={() => navigation.navigate('Settings')}>
          Ajustes
        </Text>
      ),
    });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.subtitle}>Tus trackers de hoy</Text>

        <MoodTrackerCard onSeeProgress={() => navigation.navigate('MoodProgress')} />

        {trackers.map((tracker) => (
          <TrackerCard
            key={tracker.id}
            trackerId={tracker.id}
            onSeeProgress={() => navigation.navigate('TrackerProgress', { trackerId: tracker.id })}
          />
        ))}

        <CreateTrackerButton onPress={() => navigation.navigate('CreateTracker')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  headerLink: {
    color: theme.colors.accent,
    fontWeight: '700',
    fontSize: 15,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
});
