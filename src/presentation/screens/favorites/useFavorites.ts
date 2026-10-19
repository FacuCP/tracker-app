import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { container } from '../../../core/di/container';
import { ROUTINE_TRACKER_ID } from '../../../domain/dailyRoutine/usecases/SyncRoutineTracker';
import { List } from '../../../domain/list/entities/List';
import { Tracker } from '../../../domain/tracker/entities/Tracker';
import { ListEntryDraft } from '../../list/components/ListEntryModal';
import { parseRating } from '../../list/parseRating';
import { ListCounts } from '../../list/viewmodels/useLists';

export type FavoriteCard =
  | { key: 'finance'; kind: 'finance'; title: string; typeLabel: string }
  | { key: 'mood'; kind: 'mood'; title: string; typeLabel: string }
  | { key: 'gym'; kind: 'gym'; title: string; typeLabel: string }
  | { key: string; kind: 'tracker'; title: string; typeLabel: string; tracker: Tracker }
  | { key: string; kind: 'list'; title: string; typeLabel: string; list: List; counts: ListCounts };

/**
 * ViewModel de la pestaña Favoritos: arma la lista de "cards" (resumen de
 * finanzas, mood tracker, trackers y listas favoritos) en el **orden manual**
 * que guardó el usuario, y expone el modo de reordenar (flechas ▲▼).
 */
export function useFavorites() {
  const [greeting, setGreeting] = useState('');
  const [balance, setBalance] = useState(0);
  const [cards, setCards] = useState<FavoriteCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [entryTarget, setEntryTarget] = useState<List | null>(null);
  const [reorderMode, setReorderMode] = useState(false);

  const reload = useCallback(async () => {
    const [message, profile, allTrackers, allLists, bal, savedOrder] = await Promise.all([
      container.getWelcomeMessage.execute(),
      container.getUserProfile.execute(),
      container.getTrackers.execute(),
      container.getLists.execute(),
      container.getCurrentBalance.execute(),
      container.getFavoritesOrder.execute(),
    ]);

    const favTrackers = allTrackers.filter((t) => t.favorite);
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

    const defaultOrder: FavoriteCard[] = [];
    // "Seguimiento de Rutina" va primero por defecto (antes que finanzas/mood/
    // gimnasio): es el que el usuario pidió ver arriba de todo al entrar.
    const routineTracker = favTrackers.find((t) => t.id === ROUTINE_TRACKER_ID);
    if (routineTracker) {
      defaultOrder.push({
        key: `tracker:${routineTracker.id}`,
        kind: 'tracker',
        title: routineTracker.name,
        typeLabel: 'tracker',
        tracker: routineTracker,
      });
    }
    if (profile?.financeFavorite ?? true) {
      defaultOrder.push({ key: 'finance', kind: 'finance', title: 'Finanzas', typeLabel: 'resumen' });
    }
    if (profile?.moodFavorite ?? true) {
      defaultOrder.push({ key: 'mood', kind: 'mood', title: 'Mood tracker', typeLabel: 'ánimo' });
    }
    if (profile?.gymFavorite ?? true) {
      defaultOrder.push({ key: 'gym', kind: 'gym', title: 'Gimnasio', typeLabel: 'rutina' });
    }
    for (const tracker of favTrackers) {
      if (tracker.id === ROUTINE_TRACKER_ID) continue;
      defaultOrder.push({
        key: `tracker:${tracker.id}`,
        kind: 'tracker',
        title: tracker.name,
        typeLabel: 'tracker',
        tracker,
      });
    }
    for (const list of favLists) {
      defaultOrder.push({
        key: `list:${list.id}`,
        kind: 'list',
        title: list.name,
        typeLabel: 'lista',
        list,
        counts: entryCounts[list.id] ?? { total: 0, done: 0 },
      });
    }

    const byKey = new Map(defaultOrder.map((c) => [c.key, c]));
    const ordered: FavoriteCard[] = [];
    const used = new Set<string>();
    for (const key of savedOrder) {
      const card = byKey.get(key);
      if (card && !used.has(key)) {
        ordered.push(card);
        used.add(key);
      }
    }
    for (const card of defaultOrder) {
      if (!used.has(card.key)) {
        ordered.push(card);
        used.add(card.key);
      }
    }

    setGreeting(message);
    setBalance(bal);
    setCards(ordered);
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

  const move = useCallback((key: string, direction: 'up' | 'down') => {
    setCards((prev) => {
      const i = prev.findIndex((c) => c.key === key);
      const j = direction === 'up' ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[i], next[j]] = [next[j], next[i]];
      container.saveFavoritesOrder.execute(next.map((c) => c.key)).catch(() => {});
      return next;
    });
  }, []);

  const toggleListFavorite = useCallback(
    async (list: List) => {
      await container.setListFavorite.execute(list.id, !list.favorite);
      await reload();
    },
    [reload],
  );

  const toggleFinanceFavorite = useCallback(async () => {
    const financeShown = cards.some((c) => c.kind === 'finance');
    await container.updateUserProfile.execute({ financeFavorite: !financeShown });
    await reload();
  }, [cards, reload]);

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
    balance,
    cards,
    loading,
    isEmpty: !loading && cards.length === 0,
    reorderMode,
    toggleReorder: () => setReorderMode((v) => !v),
    move,
    entryTarget,
    openAddEntry: setEntryTarget,
    closeEntryModal: () => setEntryTarget(null),
    saveEntry,
    toggleListFavorite,
    toggleFinanceFavorite,
    reload,
  };
}
