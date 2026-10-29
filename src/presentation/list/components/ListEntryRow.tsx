import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { formatDdMmYyyy } from '../../../core/utils/date';
import { theme } from '../../../core/theme';
import { ListEntry, isEntryOverdue } from '../../../domain/list/entities/ListEntry';
import { Checkbox } from '../../components/Checkbox';
import { EditButton } from '../../components/EditButton';
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
  /** Abre la edición. En to-do lists lo dispara el lápiz, no la fila (ver `onToggleDone`). */
  onPress: () => void;
  /** Solo en to-do lists: marca/desmarca la tarea — en to-do lists es lo que dispara tocar la fila. */
  onToggleDone?: () => void;
  /** Mantener presionado: empieza (o agranda) la selección múltiple. */
  onLongPress: () => void;
  /** Si hay una selección múltiple activa, la fila se muestra distinto (checkbox de selección en vez de número/checkbox/lápiz) y tocarla selecciona en vez de hacer su acción normal. */
  selectionMode: boolean;
  selected: boolean;
  onToggleSelected: () => void;
}

/**
 * Fila de una entrada en el detalle:
 *   nº / checkbox | (nombre · botón "i" · DD/MM/AAAA) / comentario recortado | ★/⚑ número
 * En listas normales, tocar la fila abre la edición. En to-do lists, tocar la
 * fila marca/desmarca hecha (lo mismo que el checkbox) y la edición se abre
 * con el lápiz aparte — tocar para completar es la acción que más se usa acá,
 * así que se le da toda la fila como blanco en vez de solo el checkbox. El
 * botón "i" muestra el comentario completo en un modal (con links tocables),
 * además de verse recortado en la fila. Mantener presionada cualquier fila
 * (to-do o normal) arranca una selección múltiple: mientras esté activa,
 * tocar cualquier fila la agrega/saca de la selección en vez de su acción
 * normal (quien arma la pantalla se encarga del tacho/cancelar). Las filas
 * van pegadas una tras otra, separadas por una línea fina.
 */
export function ListEntryRow({
  entry,
  position,
  first,
  isTodo = false,
  onPress,
  onToggleDone,
  onLongPress,
  selectionMode,
  selected,
  onToggleSelected,
}: Props) {
  const [infoOpen, setInfoOpen] = useState(false);
  const hasInfo = !!entry.comment || entry.date != null || entry.rating != null;

  const texts = (
    <View style={styles.texts}>
      <View style={styles.topLine}>
        <Text style={[styles.name, isTodo && entry.done && styles.nameDone]} numberOfLines={1}>
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
  );

  const rating =
    entry.rating != null ? (
      <Text style={styles.rating}>
        {isTodo ? '⚑' : '★'} {formatRating(entry.rating)}
      </Text>
    ) : null;

  const infoModal = hasInfo ? (
    <ListEntryInfoModal entry={infoOpen ? entry : null} isTodo={isTodo} onClose={() => setInfoOpen(false)} />
  ) : null;

  if (selectionMode) {
    return (
      <TouchableOpacity
        style={[styles.row, !first && styles.border]}
        onPress={onToggleSelected}
        onLongPress={onLongPress}
        activeOpacity={0.6}
      >
        <Checkbox checked={selected} onToggle={onToggleSelected} />
        {texts}
        {rating}
        {infoModal}
      </TouchableOpacity>
    );
  }

  if (isTodo) {
    return (
      <View style={[styles.row, !first && styles.border]}>
        <TouchableOpacity
          style={styles.mainArea}
          onPress={() => onToggleDone?.()}
          onLongPress={onLongPress}
          activeOpacity={0.6}
        >
          <Checkbox checked={entry.done} onToggle={() => onToggleDone?.()} />
          {texts}
          {rating}
        </TouchableOpacity>
        <EditButton onPress={onPress} style={styles.editButton} />
        {infoModal}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.row, !first && styles.border]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.6}
    >
      <Text style={styles.position}>{position}</Text>
      {texts}
      {rating}
      {infoModal}
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
  mainArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    padding: 2,
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
