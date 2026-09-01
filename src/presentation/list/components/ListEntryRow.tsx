import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { capitalize, formatLongDate } from '../../../core/utils/date';
import { theme } from '../../../core/theme';
import { ListEntry } from '../../../domain/list/entities/ListEntry';
import { formatRating } from '../parseRating';

interface Props {
  entry: ListEntry;
  /** Posición en la lista (1, 2, 3...). */
  position: number;
  /** Si es la primera fila (no dibuja el borde de arriba). */
  first: boolean;
  onPress: () => void;
}

/**
 * Fila de una entrada en el detalle: número | nombre + fecha | ★ rating.
 * Las filas van pegadas una tras otra, a todo el ancho, separadas por una
 * línea fina.
 */
export function ListEntryRow({ entry, position, first, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.row, !first && styles.border]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <Text style={styles.position}>{position}</Text>

      <View style={styles.texts}>
        <Text style={styles.name} numberOfLines={1}>
          {entry.name}
        </Text>
        <Text style={styles.date}>{capitalize(formatLongDate(entry.date))}</Text>
      </View>

      {entry.comment ? <Text style={styles.commentDot}>💬</Text> : null}

      {entry.rating != null ? (
        <Text style={styles.rating}>★ {formatRating(entry.rating)}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  border: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  position: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textMuted,
    minWidth: 20,
    textAlign: 'right',
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  date: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  commentDot: {
    fontSize: 13,
  },
  rating: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
  },
});
