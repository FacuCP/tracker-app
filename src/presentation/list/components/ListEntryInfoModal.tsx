import { StyleSheet, Text, View } from 'react-native';

import { formatDdMmYyyy } from '../../../core/utils/date';
import { theme } from '../../../core/theme';
import { ListEntry, isEntryOverdue } from '../../../domain/list/entities/ListEntry';
import { InfoModal } from '../../components/InfoModal';
import { formatRating } from '../parseRating';

interface Props {
  entry: ListEntry | null;
  isTodo: boolean;
  onClose: () => void;
}

/** Modal de solo lectura con toda la información de una entrada: fecha, prioridad/rating, estado y comentario. */
export function ListEntryInfoModal({ entry, isTodo, onClose }: Props) {
  return (
    <InfoModal visible={entry != null} title={entry?.name ?? ''} description={entry?.comment} onClose={onClose}>
      {entry ? (
        <View style={styles.summary}>
          {entry.date != null ? (
            <Text style={styles.summaryLine}>
              {isTodo ? 'Vence: ' : ''}
              {formatDdMmYyyy(entry.date)}
              {isTodo && isEntryOverdue(entry) ? ' · vencida' : ''}
            </Text>
          ) : null}
          {entry.rating != null ? (
            <Text style={styles.summaryLine}>
              {isTodo ? 'Prioridad' : 'Rating'}: {formatRating(entry.rating)}
            </Text>
          ) : null}
          {isTodo ? (
            <Text style={styles.summaryLine}>{entry.done ? 'Completada' : 'Pendiente'}</Text>
          ) : null}
        </View>
      ) : null}
    </InfoModal>
  );
}

const styles = StyleSheet.create({
  summary: {
    gap: 4,
  },
  summaryLine: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
});
