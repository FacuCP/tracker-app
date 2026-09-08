import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { container } from '../../../core/di/container';
import { IsoDate } from '../../../core/utils/date';
import { Tracker } from '../../../domain/tracker/entities/Tracker';
import { TrackerRangeResult } from '../../../domain/tracker/usecases/GetTrackerRange';
import { useCalendarPeriod } from '../../calendar/useCalendarPeriod';

const EMPTY_STATS = { count: 0, sum: 0, average: null, min: null, max: null } as const;

/**
 * ViewModel de la pantalla de progreso de un tracker del usuario. Comparte el
 * período con el mood tracker (`useCalendarPeriod`) y le suma el tracker, sus
 * registros y las estadísticas del rango.
 */
export function useTrackerProgress(trackerId: string) {
  const period = useCalendarPeriod();
  const [tracker, setTracker] = useState<Tracker | null>(null);
  const [data, setData] = useState<TrackerRangeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<IsoDate | null>(null);

  const { startIso, endIso } = period.range;

  const load = useCallback(async () => {
    setLoading(true);
    const [t, range] = await Promise.all([
      container.getTracker.execute(trackerId),
      container.getTrackerRange.execute(trackerId, startIso, endIso),
    ]);
    setTracker(t);
    setData(range);
    setLoading(false);
  }, [trackerId, startIso, endIso]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const entriesByDate = data?.entriesByDate ?? {};

  const saveDay = useCallback(
    async (input: { optionIds?: string[]; value?: number }) => {
      if (selectedDate == null) return;
      await container.saveTrackerEntry.execute({ trackerId, date: selectedDate, ...input });
      setSelectedDate(null);
      await load();
    },
    [selectedDate, trackerId, load],
  );

  const deleteDay = useCallback(async () => {
    if (selectedDate == null) return;
    await container.deleteTrackerEntry.execute(trackerId, selectedDate);
    setSelectedDate(null);
    await load();
  }, [selectedDate, trackerId, load]);

  return {
    ...period,
    tracker,
    entriesByDate,
    optionCounts: data?.optionCounts ?? {},
    numberStats: data?.numberStats ?? EMPTY_STATS,
    entryCount: Object.keys(entriesByDate).length,
    loading,
    selectedDate,
    selectedEntry: selectedDate ? entriesByDate[selectedDate] ?? null : null,
    openDay: setSelectedDate,
    closeDay: () => setSelectedDate(null),
    saveDay,
    deleteDay,
  };
}
