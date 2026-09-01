import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { container } from '../../../core/di/container';
import { formatLongDate, todayIso } from '../../../core/utils/date';
import { MoodColor } from '../../../domain/mood/entities/MoodColor';
import { MoodEntry } from '../../../domain/mood/entities/MoodEntry';
import { parseNoteInput } from '../parseNoteInput';

/**
 * ViewModel de la card del mood tracker en el home.
 *
 * Regla: la card sirve para CARGAR el día de hoy. Una vez guardado, se
 * muestra en modo lectura; para cambiarlo hay que ir a "Ver progreso". Por
 * eso se recarga cada vez que la pantalla vuelve a tener foco (útil si
 * editaste hoy desde el calendario).
 */
export function useMoodTrackerCard() {
  const date = todayIso();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedEntry, setSavedEntry] = useState<MoodEntry | null>(null);
  const [colors, setColors] = useState<MoodColor[]>([]);
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      container.getMoodEntry.execute(date).then((entry) => {
        if (active) {
          setSavedEntry(entry);
          setLoading(false);
        }
      });
      return () => {
        active = false;
      };
    }, [date]),
  );

  const save = useCallback(async () => {
    if (colors.length === 0) {
      return;
    }
    setSaving(true);
    try {
      const entry = await container.saveMoodEntry.execute({
        date,
        colors,
        description,
        note: parseNoteInput(note).note,
      });
      setSavedEntry(entry);
      setColors([]);
      setDescription('');
      setNote('');
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }, [colors, date, description, note]);

  return {
    dateLabel: formatLongDate(date),
    loading,
    saving,
    savedEntry,
    colors,
    setColors,
    description,
    setDescription,
    note,
    setNote,
    justSaved,
    save,
  };
}
