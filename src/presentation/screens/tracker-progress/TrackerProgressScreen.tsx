import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLayoutEffect } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '../../../core/navigation/types';
import { getTrackerOption } from '../../../domain/tracker/entities/Tracker';
import { CalendarMonth } from '../../calendar/CalendarMonth';
import { CalendarViewSwitch } from '../../calendar/CalendarViewSwitch';
import { CalendarWeek } from '../../calendar/CalendarWeek';
import { CalendarYear } from '../../calendar/CalendarYear';
import { useHorizontalSwipe } from '../../calendar/useHorizontalSwipe';
import { TrackerDayCell } from '../../tracker/components/TrackerDayCell';
import { TrackerDayModal } from '../../tracker/components/TrackerDayModal';
import { TrackerStats } from '../../tracker/components/TrackerStats';
import { useTrackerProgress } from '../../tracker/viewmodels/useTrackerProgress';

type Props = NativeStackScreenProps<RootStackParamList, 'TrackerProgress'>;

const NUMBER_DAY_FILL = '#c7d2fe';

export function TrackerProgressScreen({ route, navigation }: Props) {
  const { trackerId } = route.params;
  const vm = useTrackerProgress(trackerId);
  const tracker = vm.tracker;

  // Swipe horizontal para cambiar de vista (además del control de arriba):
  // izquierda → alejar (semana → mes → año), derecha → acercar.
  const swipe = useHorizontalSwipe({
    onSwipeLeft: vm.zoomOutView,
    onSwipeRight: vm.zoomInView,
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      title: tracker?.name ?? 'Progreso',
      headerRight: () =>
        tracker ? (
          <Text
            style={styles.editLink}
            onPress={() => navigation.navigate('EditTracker', { trackerId })}
          >
            Editar
          </Text>
        ) : null,
    });
  }, [navigation, tracker, trackerId]);

  function dayFills(date: string): string[] | undefined {
    const entry = vm.entriesByDate[date];
    if (!entry || !tracker) return undefined;
    const optionColors = entry.optionIds
      .map((id) => getTrackerOption(tracker, id)?.color)
      .filter((c): c is string => c != null);
    if (optionColors.length > 0) return optionColors;
    return entry.value != null ? [NUMBER_DAY_FILL] : undefined;
  }

  function dayLabel(date: string): string | undefined {
    const entry = vm.entriesByDate[date];
    return entry?.value != null ? String(entry.value) : undefined;
  }

  function dayHasNote(date: string): boolean {
    return !!vm.entriesByDate[date]?.comment;
  }

  const renderDay = ({ date, dayOfMonth, isToday, size }: {
    date: string;
    dayOfMonth: number;
    isToday: boolean;
    size: number;
  }) => (
    <TrackerDayCell
      day={dayOfMonth}
      date={date}
      size={size}
      isToday={isToday}
      fills={dayFills(date)}
      label={dayLabel(date)}
      hasNote={dayHasNote(date)}
      onPress={vm.openDay}
    />
  );

  if (!vm.loading && !tracker) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <Text style={styles.missing}>Este tracker ya no existe.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <CalendarViewSwitch value={vm.view} onChange={vm.setView} />

        <View style={styles.periodNav}>
          <TouchableOpacity onPress={vm.goToPrevious} style={styles.navButton}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.periodTitle}>{vm.range.title}</Text>
          <TouchableOpacity onPress={vm.goToNext} style={styles.navButton}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.summary}>
          {vm.entryCount === 0
            ? 'Sin días registrados en este período'
            : `${vm.entryCount} ${vm.entryCount === 1 ? 'día registrado' : 'días registrados'}`}
        </Text>

        {vm.loading || !tracker ? (
          <ActivityIndicator style={styles.loader} size="large" />
        ) : (
          <>
            <View {...swipe}>
              {vm.view === 'week' ? (
                <CalendarWeek anchor={vm.anchor} renderDay={renderDay} />
              ) : vm.view === 'month' ? (
                <CalendarMonth
                  year={vm.anchor.getFullYear()}
                  month={vm.anchor.getMonth()}
                  renderDay={renderDay}
                />
              ) : (
                <CalendarYear
                  year={vm.anchor.getFullYear()}
                  dayColors={dayFills}
                  onSelectMonth={vm.showMonth}
                />
              )}
            </View>

            <Text style={styles.sectionTitle}>Resumen</Text>
            <TrackerStats
              tracker={tracker}
              optionCounts={vm.optionCounts}
              numberStats={vm.numberStats}
            />
          </>
        )}
      </ScrollView>

      {tracker ? (
        <TrackerDayModal
          tracker={tracker}
          date={vm.selectedDate}
          entry={vm.selectedEntry}
          onClose={vm.closeDay}
          onSave={vm.saveDay}
          onDelete={vm.deleteDay}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#e9ebf2',
  },
  content: {
    padding: 16,
    gap: 14,
  },
  editLink: {
    color: '#2563eb',
    fontWeight: '700',
    fontSize: 15,
  },
  periodNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  navArrow: {
    fontSize: 28,
    color: '#2563eb',
    fontWeight: '700',
  },
  periodTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  summary: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: -6,
  },
  loader: {
    marginVertical: 40,
  },
  sectionTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  missing: {
    textAlign: 'center',
    marginTop: 40,
    color: '#6b7280',
  },
});
