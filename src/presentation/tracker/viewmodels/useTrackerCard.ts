import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { container } from '../../../core/di/container';
import { todayIso } from '../../../core/utils/date';
import { Tracker } from '../../../domain/tracker/entities/Tracker';
import { TrackerEntry } from '../../../domain/tracker/entities/TrackerEntry';

/**
 * ViewModel de la card de un tracker del usuario en el home.
 *
 * - Opciones: se elige una opción y se **guarda**; una vez guardado el día
 *   queda en modo lectura y se edita desde "Ver progreso" (igual que el mood
 *   tracker).
 * - Número: funciona como **contador**; cada − / + persiste al instante y se
 *   puede seguir ajustando durante el día.
 */
export function useTrackerCard(trackerId: string) {
  const date = todayIso();
  const [tracker, setTracker] = useState<Tracker | null>(null);
  const [entry, setEntry] = useState<TrackerEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOptionId, setSelectedOptionId] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const reload = useCallback(async () => {
    const [t, e] = await Promise.all([
      container.getTracker.execute(trackerId),
      container.getTrackerEntry.execute(trackerId, date),
    ]);
    setTracker(t);
    setEntry(e);
    setSelectedOptionId(undefined);
    setLoading(false);
  }, [trackerId, date]);

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

  // --- Opciones ---
  const selectOption = useCallback((optionId: string) => {
    setSelectedOptionId((prev) => (prev === optionId ? undefined : optionId));
  }, []);

  const saveOption = useCallback(async () => {
    if (!selectedOptionId) return;
    setSaving(true);
    try {
      await container.saveTrackerEntry.execute({ trackerId, date, optionId: selectedOptionId });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
      await reload();
    } finally {
      setSaving(false);
    }
  }, [selectedOptionId, trackerId, date, reload]);

  // --- Número (contador) ---
  const setCount = useCallback(
    async (next: number) => {
      const value = Math.max(0, Math.round(next));
      await container.saveTrackerEntry.execute({ trackerId, date, value });
      await reload();
    },
    [trackerId, date, reload],
  );

  const clearEntry = useCallback(async () => {
    await container.deleteTrackerEntry.execute(trackerId, date);
    await reload();
  }, [trackerId, date, reload]);

  const toggleFavorite = useCallback(async () => {
    if (!tracker) return;
    await container.setTrackerFavorite.execute(trackerId, !tracker.favorite);
    await reload();
  }, [tracker, trackerId, reload]);

  return {
    tracker,
    entry,
    loading,
    saving,
    justSaved,
    selectedOptionId,
    selectOption,
    saveOption,
    count: entry?.value ?? 0,
    setCount,
    clearEntry,
    favorite: tracker?.favorite ?? false,
    toggleFavorite,
  };
}
