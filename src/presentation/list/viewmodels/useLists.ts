import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { container } from '../../../core/di/container';
import { List } from '../../../domain/list/entities/List';
import { ListEntryDraft } from '../components/ListEntryModal';
import { parseRating } from '../parseRating';

/**
 * ViewModel de la pantalla de Listas: la lista de listas (con su conteo de
 * entradas), crear una lista, y agregarle una entrada rápida desde la card.
 */
export interface ListCounts {
  total: number;
  done: number;
}

export function useLists() {
  const [greeting, setGreeting] = useState('');
  const [lists, setLists] = useState<List[]>([]);
  const [counts, setCounts] = useState<Record<string, ListCounts>>({});
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [entryTarget, setEntryTarget] = useState<List | null>(null);

  const reload = useCallback(async () => {
    const [message, all] = await Promise.all([
      container.getWelcomeMessage.execute(),
      container.getLists.execute(),
    ]);
    const entryCounts: Record<string, ListCounts> = {};
    await Promise.all(
      all.map(async (list) => {
        const entries = await container.getListEntries.execute(list.id);
        entryCounts[list.id] = {
          total: entries.length,
          done: entries.filter((e) => e.done).length,
        };
      }),
    );
    setGreeting(message);
    setLists(all);
    setCounts(entryCounts);
    setLoading(false);
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

  const createList = useCallback(
    async (name: string, isTodo: boolean, favorite: boolean) => {
      await container.createList.execute(name, isTodo, favorite);
      setCreateOpen(false);
      await reload();
    },
    [reload],
  );

  const toggleFavorite = useCallback(
    async (list: List) => {
      await container.setListFavorite.execute(list.id, !list.favorite);
      await reload();
    },
    [reload],
  );

  const saveEntry = useCallback(
    async (draft: ListEntryDraft) => {
      if (!entryTarget) return;
      await container.saveListEntry.execute({
        listId: entryTarget.id,
        name: draft.name,
        date: draft.date,
        comment: draft.comment,
        rating: parseRating(draft.rating).rating,
      });
      setEntryTarget(null);
      await reload();
    },
    [entryTarget, reload],
  );

  return {
    greeting,
    lists,
    counts,
    loading,
    createOpen,
    openCreate: () => setCreateOpen(true),
    closeCreate: () => setCreateOpen(false),
    createList,
    toggleFavorite,
    entryTarget,
    openAddEntry: setEntryTarget,
    closeEntryModal: () => setEntryTarget(null),
    saveEntry,
    reload,
  };
}
