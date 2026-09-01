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
export function useLists() {
  const [greeting, setGreeting] = useState('');
  const [lists, setLists] = useState<List[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [entryTarget, setEntryTarget] = useState<List | null>(null);

  const reload = useCallback(async () => {
    const [message, all] = await Promise.all([
      container.getWelcomeMessage.execute(),
      container.getLists.execute(),
    ]);
    const entryCounts: Record<string, number> = {};
    await Promise.all(
      all.map(async (list) => {
        const entries = await container.getListEntries.execute(list.id);
        entryCounts[list.id] = entries.length;
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
    async (name: string) => {
      await container.createList.execute(name);
      setCreateOpen(false);
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
    entryTarget,
    openAddEntry: setEntryTarget,
    closeEntryModal: () => setEntryTarget(null),
    saveEntry,
  };
}
