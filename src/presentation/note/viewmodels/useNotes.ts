import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { container } from '../../../core/di/container';
import { Note } from '../../../domain/note/entities/Note';

/**
 * ViewModel de la pantalla de Anotaciones: la lista de anotaciones y crear
 * una nueva. Cada `NoteCard` pide sus propios mensajes (igual que `ListCard`
 * con sus entradas) — acá solo viven el nombre/favorito de cada anotación.
 */
export function useNotes() {
  const [greeting, setGreeting] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  // `NoteCard` lo usa para saber cuándo re-pedir sus mensajes, mismo patrón
  // que `reloadTick` en `useLists`/`useFavorites`.
  const [reloadTick, setReloadTick] = useState(0);

  const reload = useCallback(async () => {
    const [message, all] = await Promise.all([
      container.getWelcomeMessage.execute(),
      container.getNotes.execute(),
    ]);
    setGreeting(message);
    setNotes(all);
    setLoading(false);
    setReloadTick((t) => t + 1);
  }, []);

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

  const createNote = useCallback(
    async (name: string, favorite: boolean) => {
      await container.createNote.execute(name, favorite);
      setCreateOpen(false);
      await reload();
    },
    [reload],
  );

  const toggleFavorite = useCallback(
    async (note: Note) => {
      await container.setNoteFavorite.execute(note.id, !note.favorite);
      await reload();
    },
    [reload],
  );

  return {
    greeting,
    notes,
    loading,
    reloadTick,
    createOpen,
    openCreate: () => setCreateOpen(true),
    closeCreate: () => setCreateOpen(false),
    createNote,
    toggleFavorite,
    reload,
  };
}
