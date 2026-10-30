import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '../../../core/navigation/types';
import { theme } from '../../../core/theme';
import { ReorderRow } from '../../components/ReorderRow';
import { MoodTrackerCard } from '../../mood/components/MoodTrackerCard';
import { CreateTrackerButton } from '../../tracker/components/CreateTrackerButton';
import { TrackerCard } from '../../tracker/components/TrackerCard';
import { useTrackersViewModel } from './useTrackersViewModel';

type Props = NativeStackScreenProps<RootStackParamList, 'Trackers'>;

export function TrackersScreen({ navigation, route }: Props) {
  const vm = useTrackersViewModel();

  useEffect(() => {
    if (route.params?.create) {
      navigation.setParams({ create: undefined });
      navigation.navigate('CreateTracker');
    }
  }, [route.params?.create, navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.greeting}>{vm.greeting}</Text>
          {!vm.loading && vm.trackers.length > 1 ? (
            <TouchableOpacity onPress={vm.toggleReorder} hitSlop={8}>
              <Text style={styles.reorderButton}>{vm.reorderMode ? 'Listo' : 'Ordenar'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.subtitle}>Tus trackers de hoy</Text>

        {!vm.reorderMode ? (
          <MoodTrackerCard onSeeProgress={() => navigation.navigate('MoodProgress')} />
        ) : null}

        {vm.reorderMode
          ? vm.trackers.map((tracker, index) => (
              <ReorderRow
                key={tracker.id}
                title={tracker.name}
                typeLabel={tracker.hasCounter && tracker.options.length > 0 ? 'opciones + número' : tracker.hasCounter ? 'número' : 'opciones'}
                isFirst={index === 0}
                isLast={index === vm.trackers.length - 1}
                onUp={() => vm.move(tracker.id, 'up')}
                onDown={() => vm.move(tracker.id, 'down')}
              />
            ))
          : vm.trackers.map((tracker) => (
              <TrackerCard
                key={tracker.id}
                trackerId={tracker.id}
                onSeeProgress={() => navigation.navigate('TrackerProgress', { trackerId: tracker.id })}
              />
            ))}

        {!vm.reorderMode ? (
          <CreateTrackerButton onPress={() => navigation.navigate('CreateTracker')} />
        ) : null}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  greeting: {
    flexShrink: 1,
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
  },
  reorderButton: {
    color: theme.colors.accent,
    fontWeight: '800',
    fontSize: 14,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: -6,
    marginBottom: 6,
  },
});
