import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { container } from '../../../core/di/container';
import { List } from '../../../domain/list/entities/List';
import { ListEntry, ListSort } from '../../../domain/list/entities/ListEntry';
import { ListEntryDraft } from '../components/ListEntryModal';
import { parseRating } from '../parseRating';

/**
 * ViewModel del detalle de una lista: la lista, sus entradas (ordenadas según
 * el criterio elegido) y las acciones de agregar/editar/borrar entrada y
 * borrar la lista.
 */
export function useListDetail(listId: string) {
  const [list, setList] = useState<List | null>(null);
  const [entries, setEntries] = useState<ListEntry[]>([]);
  // `null` = todavía sin elección del usuario: se usa el orden por defecto
  // (prioridad en las to-do lists, fecha en las normales).
  const [sortOverride, setSortOverride] = useState<ListSort | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<ListEntry | null>(null);

  const sort: ListSort = sortOverride ?? (list?.isTodo ? 'rating' : 'date');

  const reload = useCallback(async () => {
    const [l, e] = await Promise.all([
      container.getList.execute(listId),
      container.getListEntries.execute(listId, sort),
    ]);
    setList(l);
    setEntries(e);
    setLoading(false);
  }, [listId, sort]);

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

  const saveEntry = useCallback(
    async (draft: ListEntryDraft) => {
      await container.saveListEntry.execute({
        id: selected?.id,
        listId,
        name: draft.name,
        date: draft.date,
        comment: draft.comment,
        rating: parseRating(draft.rating).rating,
        done: selected?.done ?? false,
      });
      setAddOpen(false);
      setSelected(null);
      await reload();
    },
    [selected, listId, reload],
  );

  const toggleDone = useCallback(
    async (entry: ListEntry) => {
      await container.setListEntryDone.execute(listId, entry.id, !entry.done);
      await reload();
    },
    [listId, reload],
  );

  const deleteEntry = useCallback(async () => {
    if (!selected) return;
    await container.deleteListEntry.execute(listId, selected.id);
    setSelected(null);
    await reload();
  }, [selected, listId, reload]);

  const deleteList = useCallback(async () => {
    await container.deleteList.execute(listId);
  }, [listId]);

  return {
    list,
    entries,
    sort,
    setSort: setSortOverride,
    loading,
    addOpen,
    openAdd: () => setAddOpen(true),
    closeAdd: () => setAddOpen(false),
    selected,
    openEntry: setSelected,
    closeEntry: () => setSelected(null),
    saveEntry,
    toggleDone,
    deleteEntry,
    deleteList,
  };
}
