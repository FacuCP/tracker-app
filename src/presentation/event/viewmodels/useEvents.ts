import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { container } from '../../../core/di/container';
import { IsoDate, endOfWeek, fromIsoDate, startOfWeek, toIsoDate, todayIso } from '../../../core/utils/date';
import { CalendarEvent } from '../../../domain/event/entities/CalendarEvent';
import { DeleteOccurrenceMode } from '../../../domain/event/usecases/DeleteEventOccurrence';
import { DayEventOccurrence } from '../../../domain/event/usecases/GetEventOccurrencesInRange';
import { useCalendarPeriod } from '../../calendar/useCalendarPeriod';
import { EventDraft } from '../components/EventModal';

/**
 * ViewModel de "Eventos": el calendario (semana/mes/año, como trackers) con
 * las franjas de cada día, crear/editar/borrar evento, y el modal de
 * "eventos de este día" al tocar una celda.
 */
export function useEvents() {
  const period = useCalendarPeriod();
  const [occurrencesByDate, setOccurrencesByDate] = useState<Record<string, DayEventOccurrence[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<IsoDate | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formDate, setFormDate] = useState<IsoDate>(todayIso());
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  /** Ocurrencia puntual que se estaba editando (puede diferir de `editingEvent.date` en un evento repetido). */
  const [editingOccurrenceDate, setEditingOccurrenceDate] = useState<IsoDate | null>(null);
  /** Evento que se está mostrando en el detalle de solo lectura (al tocar una fila de "eventos de este día"). */
  const [viewingEvent, setViewingEvent] = useState<CalendarEvent | null>(null);
  const [viewingOccurrenceDate, setViewingOccurrenceDate] = useState<IsoDate | null>(null);

  // En la vista de mes se muestran semanas completas (con días del mes
  // vecino de relleno), así que hay que traer también los eventos de esos
  // días, no solo los del mes calendario.
  const { startIso, endIso } =
    period.view === 'month'
      ? {
          startIso: toIsoDate(startOfWeek(fromIsoDate(period.range.startIso))),
          endIso: toIsoDate(endOfWeek(fromIsoDate(period.range.endIso))),
        }
      : period.range;

  const reload = useCallback(async () => {
    const byDate = await container.getEventOccurrencesInRange.execute(startIso, endIso);
    setOccurrencesByDate(byDate);
    setLoading(false);
  }, [startIso, endIso]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      reload().catch(() => {
        if (active) setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [reload]),
  );

  const dayEvents = selectedDay ? occurrencesByDate[selectedDay] ?? [] : [];

  const openNewEvent = useCallback(
    (date?: IsoDate) => {
      setEditingEvent(null);
      setFormDate(date ?? selectedDay ?? todayIso());
      setFormOpen(true);
    },
    [selectedDay],
  );

  const openEditEvent = useCallback((event: CalendarEvent, occurrenceDate: IsoDate) => {
    setEditingEvent(event);
    setEditingOccurrenceDate(occurrenceDate);
    setFormDate(event.date);
    setFormOpen(true);
  }, []);

  const openViewEvent = useCallback((event: CalendarEvent, occurrenceDate: IsoDate) => {
    setViewingEvent(event);
    setViewingOccurrenceDate(occurrenceDate);
  }, []);

  const closeView = useCallback(() => {
    setViewingEvent(null);
    setViewingOccurrenceDate(null);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingEvent(null);
    setEditingOccurrenceDate(null);
  }, []);

  const saveEvent = useCallback(
    async (draft: EventDraft) => {
      await container.saveEvent.execute({
        id: editingEvent?.id,
        name: draft.name,
        description: draft.description,
        date: draft.date,
        timeFrom: draft.timeFrom ?? undefined,
        timeTo: draft.timeTo ?? undefined,
        color: draft.color,
        repeat: draft.repeat ?? undefined,
      });
      closeForm();
      await reload();
    },
    [editingEvent, closeForm, reload],
  );

  const deleteEvent = useCallback(
    async (mode: DeleteOccurrenceMode | 'all' = 'all') => {
      if (!editingEvent) return;
      if (mode === 'all' || !editingEvent.repeat) {
        await container.deleteEvent.execute(editingEvent.id);
      } else {
        const occurrenceDate = editingOccurrenceDate ?? editingEvent.date;
        await container.deleteEventOccurrence.execute(editingEvent.id, occurrenceDate, mode);
      }
      closeForm();
      setSelectedDay(null);
      await reload();
    },
    [editingEvent, editingOccurrenceDate, closeForm, reload],
  );

  return {
    ...period,
    occurrencesByDate,
    loading,
    selectedDay,
    openDay: setSelectedDay,
    closeDay: () => setSelectedDay(null),
    dayEvents,
    formOpen,
    formDate,
    editingEvent,
    openNewEvent,
    openEditEvent,
    closeForm,
    saveEvent,
    deleteEvent,
    viewingEvent,
    viewingOccurrenceDate,
    openViewEvent,
    closeView,
  };
}
