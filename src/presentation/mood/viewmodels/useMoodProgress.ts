import { useCallback, useEffect, useState } from 'react';

import { container } from '../../../core/di/container';
import { IsoDate } from '../../../core/utils/date';
import { emptyMoodColorCounts, MoodColor } from '../../../domain/mood/entities/MoodColor';
import { MoodRangeResult } from '../../../domain/mood/usecases/GetMoodRange';
import { useCalendarPeriod } from '../../calendar/useCalendarPeriod';
import { parseNoteInput } from '../parseNoteInput';

/**
 * ViewModel de la pantalla de progreso del mood tracker: usa el período
 * compartido (`useCalendarPeriod`) y le suma los registros, los contadores de
 * color, el promedio de notas y la edición del día seleccionado.
 */
export function useMoodProgress() {
  const period = useCalendarPeriod();
  const [data, setData] = useState<MoodRangeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<IsoDate | null>(null);

  const { startIso, endIso } = period.range;

  const load = useCallback(async () => {
    setLoading(true);
    const result = await container.getMoodRange.execute(startIso, endIso);
    setData(result);
    setLoading(false);
  }, [startIso, endIso]);

  useEffect(() => {
    load();
  }, [load]);

  const entriesByDate = data?.entriesByDate ?? {};

  const saveDay = useCallback(
    async (colors: MoodColor[], description: string, note: string) => {
      if (selectedDate == null) return;
      await container.saveMoodEntry.execute({
        date: selectedDate,
        colors,
        description,
        note: parseNoteInput(note).note,
      });
      setSelectedDate(null);
      await load();
    },
    [selectedDate, load],
  );

  const deleteDay = useCallback(async () => {
    if (selectedDate == null) return;
    await container.deleteMoodEntry.execute(selectedDate);
    setSelectedDate(null);
    await load();
  }, [selectedDate, load]);

  return {
    ...period,
    entriesByDate,
    colorCounts: data?.colorCounts ?? emptyMoodColorCounts(),
    noteAverage: data?.noteAverage ?? null,
    noteCount: data?.noteCount ?? 0,
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
