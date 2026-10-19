import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '../../../core/navigation/types';
import { theme } from '../../../core/theme';
import { ROUTINE_TRACKER_ID } from '../../../domain/dailyRoutine/usecases/SyncRoutineTracker';
import { MoodTrackerCard } from '../../mood/components/MoodTrackerCard';
import { CreateTrackerButton } from '../../tracker/components/CreateTrackerButton';
import { TrackerCard } from '../../tracker/components/TrackerCard';
import { useTrackersViewModel } from './useTrackersViewModel';

type Props = NativeStackScreenProps<RootStackParamList, 'Trackers'>;

export function TrackersScreen({ navigation, route }: Props) {
  const { greeting, trackers } = useTrackersViewModel();

  useEffect(() => {
    if (route.params?.create) {
      navigation.setParams({ create: undefined });
      navigation.navigate('CreateTracker');
    }
  }, [route.params?.create, navigation]);

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
            onSeeProgress={() =>
              tracker.id === ROUTINE_TRACKER_ID
                ? navigation.navigate('DailyRoutines')
                : navigation.navigate('TrackerProgress', { trackerId: tracker.id })
            }
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
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
    gap: 12,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: -6,
    marginBottom: 6,
  },
});
