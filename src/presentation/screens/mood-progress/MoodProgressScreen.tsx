import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getMoodColorInfo } from '../../../domain/mood/entities/MoodColor';
import { CalendarMonth } from '../../calendar/CalendarMonth';
import { CalendarViewSwitch } from '../../calendar/CalendarViewSwitch';
import { CalendarWeek } from '../../calendar/CalendarWeek';
import { CalendarYear } from '../../calendar/CalendarYear';
import { useHorizontalSwipe } from '../../calendar/useHorizontalSwipe';
import { periodNoun } from '../../calendar/useCalendarPeriod';
import { DayCell } from '../../mood/components/DayCell';
import { MoodDayModal } from '../../mood/components/MoodDayModal';
import { MoodReferenceCards } from '../../mood/components/MoodReferenceCards';
import { useMoodProgress } from '../../mood/viewmodels/useMoodProgress';

export function MoodProgressScreen() {
  const vm = useMoodProgress();

  // Swipe horizontal para moverse de período (además de las flechas):
  // izquierda → siguiente, derecha → anterior.
  const swipe = useHorizontalSwipe({
    onSwipeLeft: vm.goToNext,
    onSwipeRight: vm.goToPrevious,
  });

  const renderDay = ({ date, dayOfMonth, isToday, size }: {
    date: string;
    dayOfMonth: number;
    isToday: boolean;
    size: number;
  }) => (
    <DayCell
      day={dayOfMonth}
      date={date}
      entry={vm.entriesByDate[date]}
      size={size}
      isToday={isToday}
      onPress={vm.openDay}
    />
  );

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

        <View style={styles.stats}>
          <Text style={styles.summary}>
            {vm.entryCount === 0
              ? 'Sin días registrados en este período'
              : `${vm.entryCount} ${vm.entryCount === 1 ? 'día registrado' : 'días registrados'}`}
          </Text>
          {vm.noteCount > 0 ? (
            <View style={styles.avgPill}>
              <Text style={styles.avgLabel}>Promedio de notas</Text>
              <Text style={styles.avgValue}>{vm.noteAverage}</Text>
              <Text style={styles.avgLabel}>
                · {vm.noteCount} {vm.noteCount === 1 ? 'nota' : 'notas'}
              </Text>
            </View>
          ) : null}
        </View>

        {vm.loading ? (
          <ActivityIndicator style={styles.loader} size="large" />
        ) : (
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
                dayColors={(date) => {
                  const entry = vm.entriesByDate[date];
                  return entry ? entry.colors.map((c) => getMoodColorInfo(c).hex) : undefined;
                }}
                onSelectMonth={vm.showMonth}
              />
            )}
          </View>
        )}

        <Text style={styles.sectionTitle}>Referencias</Text>
        <Text style={styles.sectionHint}>
          Cuántas veces apareció cada color en {periodNoun(vm.view)} (un día con dos
          colores suma 0.5 a cada uno). Ordenadas por cantidad.
        </Text>
        <MoodReferenceCards
          counts={vm.colorCounts}
          topMonthByColor={vm.view === 'year' ? vm.topMonthByColor : null}
        />
      </ScrollView>

      <MoodDayModal
        date={vm.selectedDate}
        entry={vm.selectedEntry}
        onClose={vm.closeDay}
        onSave={vm.saveDay}
        onDelete={vm.deleteDay}
      />
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
  stats: {
    alignItems: 'center',
    gap: 6,
    marginTop: -6,
  },
  summary: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
  avgPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eef2ff',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  avgLabel: {
    fontSize: 12,
    color: '#4b5563',
  },
  avgValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e3a8a',
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
  sectionHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: -8,
  },
});
