import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { IsoDate } from '../../../core/utils/date';
import { DiagonalSplitSquare } from '../../components/DiagonalSplitSquare';

interface Props {
  day: number;
  date: IsoDate;
  size: number;
  isToday?: boolean;
  /** Uno o dos colores de relleno (opciones elegidas). */
  fills?: string[];
  /** Texto sobre la celda (el número). */
  label?: string;
  /** Si ese día tiene un comentario guardado: muestra un punto arriba a la derecha. */
  hasNote?: boolean;
  onPress?: (date: IsoDate) => void;
}

/**
 * Celda de un día para trackers del usuario: relleno de uno o dos colores
 * (dividido en diagonal) y, opcionalmente, un número encima.
 */
export function TrackerDayCell({ day, date, size, isToday, fills, label, hasNote, onPress }: Props) {
  const colors = fills ?? [];
  const filled = colors.length > 0;

  const content = (
    <View style={[styles.cell, { width: size, height: size }]}>
      {colors.length >= 2 ? (
        <DiagonalSplitSquare
          colors={colors.slice(0, 2)}
          size={size}
          borderRadius={8}
          borderColor={isToday ? '#111827' : undefined}
        />
      ) : (
        <View
          style={[
            styles.box,
            { width: size, height: size },
            filled ? { backgroundColor: colors[0] } : styles.empty,
            isToday && styles.today,
          ]}
        />
      )}

      <View style={[styles.badge, filled && styles.badgeOnColor]}>
        <Text style={[styles.badgeText, filled && styles.badgeTextOnColor]}>{day}</Text>
      </View>

      {hasNote ? <View style={styles.noteDot} /> : null}

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
    backgroundColor: '#f1f2f7',
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
  noteDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.35)',
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
