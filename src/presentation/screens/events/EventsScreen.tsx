import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '../../../core/navigation/types';
import { theme } from '../../../core/theme';
import { CalendarMonth } from '../../calendar/CalendarMonth';
import { CalendarViewSwitch } from '../../calendar/CalendarViewSwitch';
import { CalendarWeek } from '../../calendar/CalendarWeek';
import { CalendarYear } from '../../calendar/CalendarYear';
import { useHorizontalSwipe } from '../../calendar/useHorizontalSwipe';
import { DayEventsModal } from '../../event/components/DayEventsModal';
import { EVENT_CELL_HEIGHT_RATIO, EventDayCell } from '../../event/components/EventDayCell';
import { EventDetailModal } from '../../event/components/EventDetailModal';
import { EventModal } from '../../event/components/EventModal';
import { useEvents } from '../../event/viewmodels/useEvents';

type Props = NativeStackScreenProps<RootStackParamList, 'Events'>;

/** Sin espacio entre celdas: quedan pegadas, más anchas que con el valor por defecto. */
const CELL_GAP = 0;

export function EventsScreen(_props: Props) {
  const vm = useEvents();

  // Swipe horizontal para moverse de período (además de las flechas):
  // izquierda → siguiente, derecha → anterior.
  const swipe = useHorizontalSwipe({
    onSwipeLeft: vm.goToNext,
    onSwipeRight: vm.goToPrevious,
  });

  function dayColors(date: string): string[] | undefined {
    const events = vm.occurrencesByDate[date];
    if (!events || events.length === 0) return undefined;
    return events.slice(0, 2).map(({ event }) => event.color);
  }

  function confirmDelete() {
    if (!vm.editingEvent?.repeat) {
      vm.deleteEvent('all');
      return;
    }
    Alert.alert('Borrar evento', '¿Qué querés borrar?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Solo este día', onPress: () => vm.deleteEvent('only') },
      { text: 'Este y los que siguen', style: 'destructive', onPress: () => vm.deleteEvent('thisAndFollowing') },
    ]);
  }

  const renderDay = ({
    date,
    dayOfMonth,
    isToday,
    size,
    height,
    isOutsideMonth,
  }: {
    date: string;
    dayOfMonth: number;
    isToday: boolean;
    size: number;
    height?: number;
    isOutsideMonth?: boolean;
  }) => (
    <EventDayCell
      day={dayOfMonth}
      date={date}
      size={size}
      height={height ?? size}
      isToday={isToday}
      isOutsideMonth={isOutsideMonth}
      events={vm.occurrencesByDate[date] ?? []}
      onPress={vm.openDay}
    />
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.addButton} onPress={() => vm.openNewEvent()} activeOpacity={0.8}>
          <Text style={styles.addButtonText}>＋ Agregar evento</Text>
        </TouchableOpacity>

        <CalendarViewSwitch value={vm.view} onChange={vm.setView} compact />

        <View style={styles.periodNav}>
          <TouchableOpacity onPress={vm.goToPrevious} style={styles.navButton}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.periodTitle}>{vm.range.title}</Text>
          <TouchableOpacity onPress={vm.goToNext} style={styles.navButton}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {vm.loading ? (
          <ActivityIndicator style={styles.loader} size="large" />
        ) : vm.view === 'year' ? (
          // El año no se ajusta al alto disponible (son 12 mini-calendarios);
          // si no entra en pantalla, este scroll es el único de la pantalla.
          <ScrollView contentContainerStyle={styles.yearContent}>
            <CalendarYear year={vm.anchor.getFullYear()} dayColors={dayColors} onSelectMonth={vm.showMonth} />
          </ScrollView>
        ) : (
          <GestureDetector gesture={swipe}>
            <View style={styles.calendarBody}>
              {vm.view === 'week' ? (
                <CalendarWeek
                  anchor={vm.anchor}
                  renderDay={renderDay}
                  fitHeight
                  cellAspectRatio={EVENT_CELL_HEIGHT_RATIO}
                  gap={CELL_GAP}
                />
              ) : (
                <CalendarMonth
                  year={vm.anchor.getFullYear()}
                  month={vm.anchor.getMonth()}
                  renderDay={renderDay}
                  showOverflowDays
                  fitHeight
                  gap={CELL_GAP}
                />
              )}
            </View>
          </GestureDetector>
        )}
      </View>

      <DayEventsModal
        date={vm.selectedDay}
        events={vm.dayEvents}
        onClose={vm.closeDay}
        onAddEvent={() => {
          const date = vm.selectedDay;
          vm.closeDay();
          vm.openNewEvent(date ?? undefined);
        }}
        onViewEvent={vm.openViewEvent}
        onEditEvent={(event, occurrenceDate) => {
          vm.closeDay();
          vm.openEditEvent(event, occurrenceDate);
        }}
      />

      <EventDetailModal
        event={vm.viewingEvent}
        occurrenceDate={vm.viewingOccurrenceDate}
        onClose={vm.closeView}
      />

      <EventModal
        visible={vm.formOpen}
        initialDate={vm.formDate}
        initial={vm.editingEvent}
        onClose={vm.closeForm}
        onSave={vm.saveEvent}
        onDelete={vm.editingEvent ? confirmDelete : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  calendarBody: {
    flex: 1,
  },
  yearContent: {
    paddingBottom: 16,
  },
  addButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.textMuted,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 13,
  },
  periodNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  navArrow: {
    fontSize: 22,
    color: theme.colors.accent,
    fontWeight: '700',
  },
  periodTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
  },
  loader: {
    marginVertical: 40,
  },
});
