import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { IsoDate } from '../../../core/utils/date';

interface Props {
  day: number;
  date: IsoDate;
  size: number;
  isToday?: boolean;
  /** Color de relleno del día (opción elegida). */
  fill?: string;
  /** Texto sobre la celda (el número, para trackers de tipo número). */
  label?: string;
  onPress?: (date: IsoDate) => void;
}

/**
 * Celda de un día para trackers del usuario. Más simple que la del mood
 * tracker: un solo color de relleno y, opcionalmente, un número encima.
 */
export function TrackerDayCell({ day, date, size, isToday, fill, label, onPress }: Props) {
  const filled = fill != null;
  const content = (
    <View style={[styles.cell, { width: size, height: size }]}>
      <View
        style={[
          styles.box,
          { width: size, height: size },
          filled ? { backgroundColor: fill } : styles.empty,
          isToday && styles.today,
        ]}
      />

      <View style={[styles.badge, filled && styles.badgeOnColor]}>
        <Text style={[styles.badgeText, filled && styles.badgeTextOnColor]}>{day}</Text>
      </View>

      {label != null && size >= 30 ? (
        <View style={styles.labelWrap} pointerEvents="none">
          <View style={styles.labelPill}>
            <Text style={styles.labelText}>{label}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={() => onPress(date)}>
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    position: 'absolute',
    borderRadius: 8,
  },
  empty: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  today: {
    borderWidth: 2,
    borderColor: '#111827',
  },
  badge: {
    position: 'absolute',
    top: 2,
    left: 2,
    minWidth: 15,
    paddingHorizontal: 3,
    borderRadius: 4,
    alignItems: 'center',
  },
  badgeOnColor: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  badgeTextOnColor: {
    color: '#111827',
  },
  labelWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelPill: {
    backgroundColor: 'rgba(17,24,39,0.55)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  labelText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
});
