import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { container } from '../../../core/di/container';
import { todayIso } from '../../../core/utils/date';
import { MAX_OPTIONS_PER_DAY, Tracker } from '../../../domain/tracker/entities/Tracker';
import { TrackerEntry } from '../../../domain/tracker/entities/TrackerEntry';

/**
 * ViewModel de la card de un tracker del usuario en el home.
 *
 * - Opciones: se eligen una o dos (como el mood tracker) y se **guardan**; una
 *   vez guardadas quedan en modo lectura y se editan desde "Ver progreso".
 * - Número: funciona como **contador**; cada − / + persiste al instante.
 * Un tracker puede tener las dos cosas a la vez.
 */
export function useTrackerCard(trackerId: string) {
  const date = todayIso();
  const [tracker, setTracker] = useState<Tracker | null>(null);
  const [entry, setEntry] = useState<TrackerEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const reload = useCallback(async () => {
    const [t, e] = await Promise.all([
      container.getTracker.execute(trackerId),
      container.getTrackerEntry.execute(trackerId, date),
    ]);
    setTracker(t);
    setEntry(e);
    setSelectedOptionIds([]);
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

  // --- Opciones (hasta 2, reemplaza la más vieja) ---
  const toggleOption = useCallback((optionId: string) => {
    setSelectedOptionIds((prev) => {
      if (prev.includes(optionId)) return prev.filter((id) => id !== optionId);
      if (prev.length < MAX_OPTIONS_PER_DAY) return [...prev, optionId];
      return [...prev.slice(1), optionId];
    });
  }, []);

  const saveOptions = useCallback(async () => {
    if (selectedOptionIds.length === 0) return;
    setSaving(true);
    try {
      await container.saveTrackerEntry.execute({
        trackerId,
        date,
        optionIds: selectedOptionIds,
        value: entry?.value,
      });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
      await reload();
    } finally {
      setSaving(false);
    }
  }, [selectedOptionIds, trackerId, date, entry, reload]);

  // --- Número (contador) ---
  const setCount = useCallback(
    async (next: number) => {
      const value = Math.max(0, Math.round(next));
      await container.saveTrackerEntry.execute({
        trackerId,
        date,
        value,
        optionIds: entry?.optionIds ?? [],
      });
      await reload();
    },
    [trackerId, date, entry, reload],
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
    selectedOptionIds,
    toggleOption,
    saveOptions,
    optionsLocked: (entry?.optionIds.length ?? 0) > 0,
    count: entry?.value ?? 0,
    setCount,
    clearEntry,
    favorite: tracker?.favorite ?? false,
    toggleFavorite,
  };
}
