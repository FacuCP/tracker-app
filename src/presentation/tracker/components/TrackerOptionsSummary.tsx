import { StyleSheet, Text, View } from 'react-native';

import { Tracker, getTrackerOption } from '../../../domain/tracker/entities/Tracker';
import { EditButton } from '../../components/EditButton';

interface Props {
  tracker: Tracker;
  optionIds: readonly string[];
  /** Línea chica debajo de las opciones (p. ej. "Ya registraste hoy."). */
  hint?: string;
  /** Comentario del día, si tiene — se muestra en gris debajo del nombre. */
  comment?: string;
  /** Si se pasa, muestra un lápiz a la altura de esta fila para volver a editar. */
  onEdit?: () => void;
}

/** Vista de solo lectura de las opciones elegidas un día: puntos de color + nombres. Compartida entre `TrackerCard` y `TrackerDayModal`. */
export function TrackerOptionsSummary({ tracker, optionIds, hint, comment, onEdit }: Props) {
  const labels = optionIds.map((id) => getTrackerOption(tracker, id)?.label ?? '—');
  const colors = optionIds.map((id) => getTrackerOption(tracker, id)?.color ?? '#9ca3af');

  return (
    <View style={styles.summary}>
      <View style={styles.summaryDots}>
        {colors.map((color, i) => (
          <View key={i} style={[styles.summaryDot, { backgroundColor: color }]} />
        ))}
      </View>
      <View style={styles.summaryTexts}>
        <Text style={styles.summaryLabel}>{labels.join(' · ') || '—'}</Text>
        {comment ? <Text style={styles.summaryComment}>{comment}</Text> : null}
        {hint ? <Text style={styles.summaryHint}>{hint}</Text> : null}
      </View>
      {onEdit ? <EditButton onPress={onEdit} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryDots: {
    flexDirection: 'row',
    gap: 4,
  },
  summaryDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  summaryTexts: {
    flex: 1,
    gap: 2,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  summaryComment: {
    fontSize: 13,
    color: '#6b7280',
  },
  summaryHint: {
    fontSize: 12,
    color: '#9ca3af',
  },
});
