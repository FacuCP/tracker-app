import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '../../../core/theme';
import { ROUTINE_TRACKER_OPTIONS } from '../../../domain/dailyRoutine/usecases/SyncRoutineTracker';
import { getTrackerOption, Tracker } from '../../../domain/tracker/entities/Tracker';
import { TrackerEntry } from '../../../domain/tracker/entities/TrackerEntry';
import { CalendarMonth } from '../../calendar/CalendarMonth';
import { CalendarViewSwitch } from '../../calendar/CalendarViewSwitch';
import { CalendarWeek } from '../../calendar/CalendarWeek';
import { CalendarYear } from '../../calendar/CalendarYear';
import { useCalendarPeriod } from '../../calendar/useCalendarPeriod';
import { TrackerDayCell } from '../../tracker/components/TrackerDayCell';
import { TrackerStats } from '../../tracker/components/TrackerStats';

const EMPTY_NUMBER_STATS = { count: 0, sum: 0, average: null, min: null, max: null } as const;

interface Props {
  tracker: Tracker;
  entriesByDate: Record<string, TrackerEntry>;
  optionCounts: Record<string, number>;
  period: ReturnType<typeof useCalendarPeriod>;
}

/**
 * "Seguimiento de Rutina", mostrado igual que el progreso de cualquier otro
 * tracker: semana/mes/año con navegación, y abajo un contador por color del
 * período. Es de solo lectura (el color de cada día lo pone `SyncRoutineTracker`
 * solo, no se edita a mano).
 */
export function RoutineTrackerCalendar({ tracker, entriesByDate, optionCounts, period }: Props) {
  function dayFills(date: string): string[] | undefined {
    const entry = entriesByDate[date];
    if (!entry) return undefined;
    const colors = entry.optionIds
      .map((id) => getTrackerOption(tracker, id)?.color)
      .filter((c): c is string => c != null);
    return colors.length > 0 ? colors : undefined;
  }

  const renderDay = ({
    date,
    dayOfMonth,
    isToday,
    size,
  }: {
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
      hasNote={!!entriesByDate[date]?.comment}
    />
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Seguimiento de Rutina</Text>

      <CalendarViewSwitch value={period.view} onChange={period.setView} />

      <View style={styles.periodNav}>
        <TouchableOpacity onPress={period.goToPrevious} style={styles.navButton} hitSlop={6}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.periodTitle}>{period.range.title}</Text>
        <TouchableOpacity onPress={period.goToNext} style={styles.navButton} hitSlop={6}>
          <Text style={styles.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {period.view === 'week' ? (
        <CalendarWeek anchor={period.anchor} renderDay={renderDay} />
      ) : period.view === 'month' ? (
        <CalendarMonth year={period.anchor.getFullYear()} month={period.anchor.getMonth()} renderDay={renderDay} />
      ) : (
        <CalendarYear year={period.anchor.getFullYear()} dayColors={dayFills} onSelectMonth={period.showMonth} />
      )}

      <TrackerStats tracker={tracker} optionCounts={optionCounts} numberStats={EMPTY_NUMBER_STATS} />

      <View style={styles.legend}>
        {ROUTINE_TRACKER_OPTIONS.map((option) => (
          <View key={option.id} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: option.color }]} />
            <Text style={styles.legendLabel}>{option.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  periodNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  navArrow: {
    fontSize: 24,
    color: theme.colors.accent,
    fontWeight: '700',
  },
  periodTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
});
