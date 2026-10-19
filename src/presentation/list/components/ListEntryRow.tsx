import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { formatDdMmYyyy } from '../../../core/utils/date';
import { theme } from '../../../core/theme';
import { ListEntry, isEntryOverdue } from '../../../domain/list/entities/ListEntry';
import { Checkbox } from '../../components/Checkbox';
import { InfoButton } from '../../components/InfoButton';
import { formatRating } from '../parseRating';
import { ListEntryInfoModal } from './ListEntryInfoModal';

interface Props {
  entry: ListEntry;
  /** Posición en la lista (1, 2, 3...). Se muestra en listas normales. */
  position: number;
  /** Si es la primera fila (no dibuja el borde de arriba). */
  first: boolean;
  /** Si la lista es una to-do list (checkbox en vez de número, "prioridad"). */
  isTodo?: boolean;
  onPress: () => void;
  /** Solo en to-do lists: marca/desmarca la tarea sin abrir el modal. */
  onToggleDone?: () => void;
}

/**
 * Fila de una entrada en el detalle:
 *   nº / checkbox | (nombre · botón "i" · DD/MM/AAAA) / comentario recortado | ★/⚑ número
 * Tocar la fila abre la edición; el botón "i" muestra el comentario completo
 * en un modal (con links tocables), además de verse recortado en la fila.
 * Las filas van pegadas una tras otra, separadas por una línea fina.
 */
export function ListEntryRow({ entry, position, first, isTodo = false, onPress, onToggleDone }: Props) {
  const [infoOpen, setInfoOpen] = useState(false);
  const hasInfo = !!entry.comment || entry.date != null || entry.rating != null;

  return (
    <TouchableOpacity
      style={[styles.row, !first && styles.border]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      {isTodo ? (
        <Checkbox checked={entry.done} onToggle={() => onToggleDone?.()} />
      ) : (
        <Text style={styles.position}>{position}</Text>
      )}

      <View style={styles.texts}>
        <View style={styles.topLine}>
          <Text
            style={[styles.name, isTodo && entry.done && styles.nameDone]}
            numberOfLines={1}
          >
            {entry.name}
          </Text>
          {hasInfo ? <InfoButton onPress={() => setInfoOpen(true)} /> : null}
          {isTodo ? (
            <>
              {entry.date != null ? (
                <Text style={styles.date}>vence: {formatDdMmYyyy(entry.date)}</Text>
              ) : null}
              {isEntryOverdue(entry) ? <Text style={styles.overdue}>vencida</Text> : null}
            </>
          ) : entry.date != null ? (
            <Text style={styles.date}>{formatDdMmYyyy(entry.date)}</Text>
          ) : null}
        </View>
        {entry.comment ? (
          <Text style={styles.comment} numberOfLines={1} ellipsizeMode="tail">
            {entry.comment}
          </Text>
        ) : null}
      </View>

      {entry.rating != null ? (
        <Text style={styles.rating}>
          {isTodo ? '⚑' : '★'} {formatRating(entry.rating)}
        </Text>
      ) : null}

      {hasInfo ? (
        <ListEntryInfoModal
          entry={infoOpen ? entry : null}
          isTodo={isTodo}
          onClose={() => setInfoOpen(false)}
        />
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
  topLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  name: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  nameDone: {
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
  date: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  overdue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#dc2626',
  },
  comment: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  rating: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
  },
});
