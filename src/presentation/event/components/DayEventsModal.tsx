import { Pencil } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { IsoDate, capitalize, formatLongDate } from '../../../core/utils/date';
import { theme } from '../../../core/theme';
import { CalendarEvent } from '../../../domain/event/entities/CalendarEvent';
import { DayEventOccurrence } from '../../../domain/event/usecases/GetEventOccurrencesInRange';
import { eventTimeLabel } from './eventTimeLabel';

interface Props {
  date: IsoDate | null;
  events: DayEventOccurrence[];
  onClose: () => void;
  onAddEvent: () => void;
  /** Tocar el evento (fuera del botón de editar): abre el detalle, de solo lectura. */
  onViewEvent: (event: CalendarEvent, occurrenceDate: IsoDate) => void;
  /** Botón de lápiz a la izquierda: abre directo el formulario de edición. */
  onEditEvent: (event: CalendarEvent, occurrenceDate: IsoDate) => void;
}

/** Modal con los eventos de un día: tocar uno ve su detalle, el lápiz a la izquierda lo edita, y hay un botón para agregar uno nuevo ese día. */
export function DayEventsModal({ date, events, onClose, onAddEvent, onViewEvent, onEditEvent }: Props) {
  return (
    <Modal visible={date != null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>{date ? capitalize(formatLongDate(date)) : ''}</Text>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {events.length === 0 ? (
              <Text style={styles.empty}>Sin eventos este día.</Text>
            ) : (
              events.map(({ event, date: occurrenceDate }) => {
                const timeLabel = eventTimeLabel(event);
                return (
                  <View key={event.id} style={styles.eventRow}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => onEditEvent(event, occurrenceDate)}
                      activeOpacity={0.6}
                      hitSlop={8}
                    >
                      <Pencil size={16} color={theme.colors.accent} strokeWidth={2.25} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.eventMain}
                      onPress={() => onViewEvent(event, occurrenceDate)}
                      activeOpacity={0.6}
                    >
                      <View style={styles.eventHeaderRow}>
                        <View style={[styles.dot, { backgroundColor: event.color }]} />
                        {timeLabel ? <Text style={styles.eventTime}>{timeLabel}</Text> : null}
                        <Text style={styles.eventName} numberOfLines={1}>
                          {event.name}
                        </Text>
                      </View>
                      {event.description ? (
                        <Text style={styles.eventDescription} numberOfLines={1}>
                          {event.description}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </ScrollView>

          <TouchableOpacity style={styles.addButton} onPress={onAddEvent} activeOpacity={0.8}>
            <Text style={styles.addButtonText}>＋ Agregar evento</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '75%',
    gap: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  list: {
    marginVertical: 4,
  },
  listContent: {
    gap: 8,
  },
  empty: {
    color: theme.colors.textMuted,
    fontSize: 14,
    paddingVertical: 8,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  editButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
  },
  eventMain: {
    flex: 1,
    gap: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  eventHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  eventTime: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  eventName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  eventDescription: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  addButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.textMuted,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 14,
  },
});
