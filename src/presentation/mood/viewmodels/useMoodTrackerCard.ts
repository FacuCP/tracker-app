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
 * muestra en modo lectura (resumen); un lápiz ahí mismo (`openEdit`) vuelve a
 * mostrar el editor, precargado, para cambiarlo sin salir de la card — mismo
 * patrón que los trackers normales (`useTrackerCard`). Se recarga cada vez
 * que la pantalla vuelve a tener foco (útil si editaste hoy desde el
 * calendario), sin pisar una edición en curso.
 */
export function useMoodTrackerCard() {
  const date = todayIso();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedEntry, setSavedEntry] = useState<MoodEntry | null>(null);
  const [colors, setColors] = useState<MoodColor[]>([]);
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  // Fuerza el modo edición aunque ya haya un registro guardado hoy — por
  // defecto, un registro guardado se ve en modo lectura (resumen).
  const [editing, setEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [favorite, setFavorite] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        container.getMoodEntry.execute(date),
        container.getUserProfile.execute(),
      ]).then(([entry, profile]) => {
        if (active) {
          setSavedEntry(entry);
          setFavorite(profile?.moodFavorite ?? true);
          setLoading(false);
        }
      });
      return () => {
        active = false;
      };
    }, [date]),
  );

  const toggleFavorite = useCallback(async () => {
    const next = !favorite;
    setFavorite(next);
    await container.updateUserProfile.execute({ moodFavorite: next });
  }, [favorite]);

  const openEdit = useCallback(() => {
    if (!savedEntry) return;
    setColors([...savedEntry.colors]);
    setDescription(savedEntry.description ?? '');
    setNote(savedEntry.note != null ? String(savedEntry.note) : '');
    setEditing(true);
  }, [savedEntry]);

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
      setEditing(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }, [colors, date, description, note]);

  const deleteEntry = useCallback(async () => {
    await container.deleteMoodEntry.execute(date);
    setSavedEntry(null);
    setColors([]);
    setDescription('');
    setNote('');
    setEditing(false);
  }, [date]);

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
    editing,
    openEdit,
    justSaved,
    save,
    deleteEntry,
    favorite,
    toggleFavorite,
  };
}
