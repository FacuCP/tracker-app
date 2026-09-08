import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { IsoDate } from '../../../core/utils/date';
import { getMoodColorInfo } from '../../../domain/mood/entities/MoodColor';
import { MoodEntry } from '../../../domain/mood/entities/MoodEntry';
import { formatNote } from '../parseNoteInput';
import { DiagonalSplitSquare } from '../../components/DiagonalSplitSquare';

interface Props {
  day: number;
  date: IsoDate;
  entry?: MoodEntry;
  size: number;
  isToday?: boolean;
  onPress?: (date: IsoDate) => void;
}

/**
 * Celda de un día en el calendario. Si el día tiene registro se pinta con
 * DiagonalSplitSquare; el número del día queda siempre legible en un chip
 * blanco arriba a la izquierda, y la nota (si hay) se muestra grande y
 * centrada sobre los colores.
 */
export function DayCell({ day, date, entry, size, isToday, onPress }: Props) {
  const showNote = entry?.note != null && size >= 30;

  const content = (
    <View style={[styles.cell, { width: size, height: size }]}>
      {entry ? (
        <DiagonalSplitSquare
          colors={entry.colors.map((c) => getMoodColorInfo(c).hex)}
          size={size}
          borderRadius={8}
          borderColor={isToday ? '#111827' : undefined}
        />
      ) : (
        <View style={[styles.empty, { width: size, height: size }, isToday && styles.today]} />
      )}

      <View style={[styles.badge, entry != null && styles.badgeOnColor]}>
        <Text style={[styles.badgeText, entry != null && styles.badgeTextOnColor]}>{day}</Text>
      </View>

      {showNote ? (
        <View style={styles.noteOverlay} pointerEvents="none">
          <View style={styles.notePill}>
            <Text style={styles.noteText}>{formatNote(entry!.note!)}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );

  if (!onPress) {
    return content;
  }
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
  empty: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f1f2f7',
  },
  today: {
    borderColor: '#111827',
    borderWidth: 2,
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
  noteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notePill: {
    backgroundColor: 'rgba(17,24,39,0.55)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  noteText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
});
