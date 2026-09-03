import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { container } from '../../../core/di/container';
import { List } from '../../../domain/list/entities/List';
import { Tracker } from '../../../domain/tracker/entities/Tracker';
import { ListEntryDraft } from '../../list/components/ListEntryModal';
import { parseRating } from '../../list/parseRating';
import { ListCounts } from '../../list/viewmodels/useLists';

export type FavoritesSort = 'type' | 'alpha' | 'recent';

export type FavoriteItem =
  | { type: 'tracker'; id: string; name: string; createdAt: string; tracker: Tracker }
  | { type: 'list'; id: string; name: string; createdAt: string; list: List };

/**
 * ViewModel de la pestaña Favoritos: el saludo, los trackers y listas marcados
 * como favoritos (con el conteo de entradas de cada lista) y las acciones de
 * desmarcar favorito y de agregar una entrada rápida a una lista favorita.
 */
export function useFavorites() {
  const [greeting, setGreeting] = useState('');
  const [moodFavorite, setMoodFavorite] = useState(true);
  const [financeFavorite, setFinanceFavorite] = useState(true);
  const [balance, setBalance] = useState(0);
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [counts, setCounts] = useState<Record<string, ListCounts>>({});
  const [loading, setLoading] = useState(true);
  const [entryTarget, setEntryTarget] = useState<List | null>(null);
  const [sort, setSort] = useState<FavoritesSort>('type');

  const reload = useCallback(async () => {
    const [message, profile, allTrackers, allLists, bal] = await Promise.all([
      container.getWelcomeMessage.execute(),
      container.getUserProfile.execute(),
      container.getTrackers.execute(),
      container.getLists.execute(),
      container.getCurrentBalance.execute(),
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
    setFinanceFavorite(profile?.financeFavorite ?? true);
    setBalance(bal);
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

  const toggleFinanceFavorite = useCallback(async () => {
    await container.updateUserProfile.execute({ financeFavorite: !financeFavorite });
    await reload();
  }, [financeFavorite, reload]);

  const items = useMemo<FavoriteItem[]>(() => {
    const combined: FavoriteItem[] = [
      ...trackers.map(
        (t): FavoriteItem => ({
          type: 'tracker',
          id: t.id,
          name: t.name,
          createdAt: t.createdAt,
          tracker: t,
        }),
      ),
      ...lists.map(
        (l): FavoriteItem => ({
          type: 'list',
          id: l.id,
          name: l.name,
          createdAt: l.createdAt,
          list: l,
        }),
      ),
    ];
    const byName = (a: FavoriteItem, b: FavoriteItem) =>
      a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
    if (sort === 'alpha') {
      combined.sort(byName);
    } else if (sort === 'recent') {
      combined.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || byName(a, b));
    } else {
      combined.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'tracker' ? -1 : 1;
        return a.createdAt.localeCompare(b.createdAt);
      });
    }
    return combined;
  }, [trackers, lists, sort]);

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
    financeFavorite,
    balance,
    trackers,
    lists,
    items,
    sort,
    setSort,
    counts,
    loading,
    isEmpty:
      !loading &&
      !moodFavorite &&
      !financeFavorite &&
      trackers.length === 0 &&
      lists.length === 0,
    entryTarget,
    openAddEntry: setEntryTarget,
    closeEntryModal: () => setEntryTarget(null),
    saveEntry,
    toggleListFavorite,
    toggleFinanceFavorite,
    reload,
  };
}
