import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { IsoDate } from '../../../core/utils/date';
import { theme } from '../../../core/theme';
import { DayEventOccurrence } from '../../../domain/event/usecases/GetEventOccurrencesInRange';

interface Props {
  day: number;
  date: IsoDate;
  /** Ancho de la celda, calculado por el layout del calendario. */
  size: number;
  /** Alto de la celda, calculado por el layout del calendario (ver `fitHeight` en `CalendarMonth`/`CalendarWeek`). */
  height: number;
  isToday?: boolean;
  /** true si el día pertenece al mes anterior/siguiente (relleno de semana completa). */
  isOutsideMonth?: boolean;
  events: DayEventOccurrence[];
  onPress: (date: IsoDate) => void;
}

/** Relación alto/ancho "natural" de la celda (más alta que ancha, para que entren franjas de color por evento). */
export const EVENT_CELL_HEIGHT_RATIO = 1.9;
const MAX_VISIBLE_STRIPES = 3;

/** Celda de un día con una franja de color por evento (más alta que la de los trackers). */
export function EventDayCell({ day, date, size, height, isToday, isOutsideMonth, events, onPress }: Props) {
  const visible = events.slice(0, MAX_VISIBLE_STRIPES);
  const extra = events.length - visible.length;

  return (
    <TouchableOpacity
      style={[styles.cell, { width: size, height }, isOutsideMonth && styles.outsideMonth, isToday && styles.today]}
      onPress={() => onPress(date)}
      activeOpacity={0.7}
    >
      <Text style={styles.day}>{day}</Text>
      <View style={styles.stripes}>
        {visible.map(({ event }) => (
          <View key={event.id} style={[styles.stripe, { backgroundColor: event.color }]}>
            {size >= 40 ? (
              <Text style={styles.stripeText} numberOfLines={1}>
                {event.name}
              </Text>
            ) : null}
          </View>
        ))}
        {extra > 0 ? <Text style={styles.more}>+{extra}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cell: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    padding: 3,
    gap: 2,
  },
  outsideMonth: {
    backgroundColor: theme.colors.background,
  },
  today: {
    borderWidth: 2,
    borderColor: theme.colors.text,
  },
  day: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  stripes: {
    gap: 2,
  },
  stripe: {
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
    minHeight: 12,
  },
  stripeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  more: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
});
