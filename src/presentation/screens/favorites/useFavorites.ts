import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { container } from '../../../core/di/container';
import { List } from '../../../domain/list/entities/List';
import { Tracker } from '../../../domain/tracker/entities/Tracker';
import { ListEntryDraft } from '../../list/components/ListEntryModal';
import { parseRating } from '../../list/parseRating';
import { ListCounts } from '../../list/viewmodels/useLists';

/**
 * ViewModel de la pestaña Favoritos: el saludo, los trackers y listas marcados
 * como favoritos (con el conteo de entradas de cada lista) y las acciones de
 * desmarcar favorito y de agregar una entrada rápida a una lista favorita.
 */
export function useFavorites() {
  const [greeting, setGreeting] = useState('');
  const [moodFavorite, setMoodFavorite] = useState(true);
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [counts, setCounts] = useState<Record<string, ListCounts>>({});
  const [loading, setLoading] = useState(true);
  const [entryTarget, setEntryTarget] = useState<List | null>(null);

  const reload = useCallback(async () => {
    const [message, profile, allTrackers, allLists] = await Promise.all([
      container.getWelcomeMessage.execute(),
      container.getUserProfile.execute(),
      container.getTrackers.execute(),
      container.getLists.execute(),
    ]);
    const favLists = allLists.filter((l) => l.favorite);
    const entryCounts: Record<string, ListCounts> = {};
    await Promise.all(
      favLists.map(async (list) => {
        const entries = await container.getListEntries.execute(list.id);
        entryCounts[list.id] = {
          total: entries.length,
          done: entries.filter((e) => e.done).length,
        };
      }),
    );
    setGreeting(message);
    setMoodFavorite(profile?.moodFavorite ?? true);
    setTrackers(allTrackers.filter((t) => t.favorite));
    setLists(favLists);
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

  const toggleListFavorite = useCallback(
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
    moodFavorite,
    trackers,
    lists,
    counts,
    loading,
    isEmpty: !loading && !moodFavorite && trackers.length === 0 && lists.length === 0,
    entryTarget,
    openAddEntry: setEntryTarget,
    closeEntryModal: () => setEntryTarget(null),
    saveEntry,
    toggleListFavorite,
    reload,
  };
}
