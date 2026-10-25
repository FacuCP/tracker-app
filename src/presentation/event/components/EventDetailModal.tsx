import { StyleSheet, Text, View } from 'react-native';

import { IsoDate, capitalize, formatDdMmYyyy, formatLongDate } from '../../../core/utils/date';
import { theme } from '../../../core/theme';
import { CalendarEvent } from '../../../domain/event/entities/CalendarEvent';
import { InfoModal } from '../../components/InfoModal';
import { eventTimeLabel } from './eventTimeLabel';

interface Props {
  event: CalendarEvent | null;
  /** Fecha de la ocurrencia puntual que se está mostrando (puede diferir de `event.date` en uno repetido). */
  occurrenceDate: IsoDate | null;
  onClose: () => void;
}

function repeatSummary(event: CalendarEvent): string | null {
  const repeat = event.repeat;
  if (!repeat) return null;
  const unitLabel = repeat.intervalUnit === 'months' ? 'meses' : 'días';
  const every =
    repeat.intervalValue === 1
      ? repeat.intervalUnit === 'months'
        ? 'Todos los meses'
        : 'Todos los días'
      : `Cada ${repeat.intervalValue} ${unitLabel}`;
  if (repeat.endType === 'onDate' && repeat.endDate) {
    return `${every}, hasta el ${formatDdMmYyyy(repeat.endDate)}`;
  }
  if (repeat.endType === 'afterCount' && repeat.count) {
    return `${every}, ${repeat.count} ${repeat.count === 1 ? 'vez' : 'veces'} en total`;
  }
  return `${every}, indefinidamente`;
}

/** Modal de solo lectura con la información de un evento (tocarlo desde "eventos de este día" abre esto; el lápiz de esa fila edita). Reusa el `InfoModal` genérico de descripciones. */
export function EventDetailModal({ event, occurrenceDate, onClose }: Props) {
  return (
    <InfoModal
      visible={event != null && occurrenceDate != null}
      title={event?.name ?? ''}
      description={event?.description}
      onClose={onClose}
    >
      {event && occurrenceDate ? (
        <>
          <View style={styles.header}>
            <View style={[styles.dot, { backgroundColor: event.color }]} />
            <Text style={styles.date}>{capitalize(formatLongDate(occurrenceDate))}</Text>
          </View>
          {eventTimeLabel(event) ? <Text style={styles.detailText}>{eventTimeLabel(event)}</Text> : null}
          {repeatSummary(event) ? <Text style={styles.detailText}>{repeatSummary(event)}</Text> : null}
        </>
      ) : null}
    </InfoModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  date: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
