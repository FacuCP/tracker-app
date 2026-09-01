import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLayoutEffect } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '../../../core/navigation/types';
import { MoodTrackerCard } from '../../mood/components/MoodTrackerCard';
import { CreateTrackerButton } from '../../tracker/components/CreateTrackerButton';
import { TrackerCard } from '../../tracker/components/TrackerCard';
import { useHomeViewModel } from './useHomeViewModel';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { greeting, trackers } = useHomeViewModel();

  useLayoutEffect(() => {
    navigation.setOptions({
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
    backgroundColor: '#f4f5f7',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  headerLink: {
    color: '#2563eb',
    fontWeight: '700',
    fontSize: 15,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
});
