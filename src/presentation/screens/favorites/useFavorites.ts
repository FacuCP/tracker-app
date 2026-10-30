import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { container } from '../../../core/di/container';
import { DailyRoutineTaskStatus } from '../../../domain/dailyRoutine/usecases/GetDailyRoutineSession';
import { ROUTINE_TRACKER_ID } from '../../../domain/dailyRoutine/usecases/SyncRoutineTracker';
import { List } from '../../../domain/list/entities/List';
import { Tracker } from '../../../domain/tracker/entities/Tracker';
import { ListEntryDraft } from '../../list/components/ListEntryModal';
import { parseRating } from '../../list/parseRating';
import { ListCounts } from '../../list/viewmodels/useLists';

export type FavoriteCard =
  | {
      key: 'dailyRoutine';
      kind: 'dailyRoutine';
      title: string;
      typeLabel: string;
      tasks: DailyRoutineTaskStatus[];
      doneCount: number;
      total: number;
    }
  | { key: 'finance'; kind: 'finance'; title: string; typeLabel: string }
  | { key: 'mood'; kind: 'mood'; title: string; typeLabel: string }
  | { key: 'gym'; kind: 'gym'; title: string; typeLabel: string }
  | { key: 'trackers'; kind: 'trackers'; title: string; typeLabel: string; trackers: Tracker[] }
  | {
      key: 'lists';
      kind: 'lists';
      title: string;
      typeLabel: string;
      lists: List[];
      counts: Record<string, ListCounts>;
    };

/**
 * ViewModel de la pestaña Favoritos: arma la lista de "cards" (rutina diaria,
 * resumen de finanzas, mood tracker, trackers y listas favoritos) en el
 * **orden manual** que guardó el usuario, y expone el modo de reordenar
 * (flechas ▲▼).
 */
export function useFavorites() {
  const [greeting, setGreeting] = useState('');
  const [balance, setBalance] = useState(0);
  const [cards, setCards] = useState<FavoriteCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [entryTarget, setEntryTarget] = useState<List | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  // Se suma 1 cada reload exitoso — `ListCard` lo usa para saber cuándo
  // re-pedir sus entradas en vez de `counts.total`/`counts.done` (que no
  // cambian si solo se editó un campo de una entrada sin tocar cuántas hay
  // ni cuántas están hechas, así que una edición así no se veía reflejada
  // al volver a Favoritos).
  const [reloadTick, setReloadTick] = useState(0);

  const reload = useCallback(async () => {
    const [message, profile, allTrackers, allLists, bal, savedOrder, dailyRoutineSession] = await Promise.all([
      container.getWelcomeMessage.execute(),
      container.getUserProfile.execute(),
      container.getTrackers.execute(),
      container.getLists.execute(),
      container.getCurrentBalance.execute(),
      container.getFavoritesOrder.execute(),
      container.getDailyRoutineSession.execute(),
    ]);

    // "Seguimiento de Rutina" es de uso interno (solo lo lee el calendario de
    // Rutina diaria) — no aparece acá como tracker más, lo reemplaza la card
    // de "dailyRoutine" de abajo (lista de tareas + % completado).
    const favTrackers = allTrackers.filter((t) => t.favorite && t.id !== ROUTINE_TRACKER_ID);
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

    // Todos los trackers favoritos van juntos en una sola card con swipe
    // (igual las listas).
    const trackersCard: FavoriteCard | null =
      favTrackers.length > 0
        ? {
            key: 'trackers',
            kind: 'trackers',
            title: 'Trackers',
            typeLabel: `${favTrackers.length} ${favTrackers.length === 1 ? 'tracker' : 'trackers'}`,
            trackers: favTrackers,
          }
        : null;
    const listsCard: FavoriteCard | null =
      favLists.length > 0
        ? {
            key: 'lists',
            kind: 'lists',
            title: 'Listas',
            typeLabel: `${favLists.length} ${favLists.length === 1 ? 'lista' : 'listas'}`,
            lists: favLists,
            counts: entryCounts,
          }
        : null;
    const dailyRoutineCard: FavoriteCard = {
      key: 'dailyRoutine',
      kind: 'dailyRoutine',
      title: 'Rutina diaria',
      typeLabel:
        dailyRoutineSession.total === 0
          ? 'sin tareas'
          : `${dailyRoutineSession.doneCount}/${dailyRoutineSession.total} hechas`,
      tasks: dailyRoutineSession.tasks,
      doneCount: dailyRoutineSession.doneCount,
      total: dailyRoutineSession.total,
    };

    const defaultOrder: FavoriteCard[] = [];
    // La card de Rutina diaria va primero por defecto: es la que el usuario
    // pidió ver arriba de todo al entrar (antes era el tracker "Seguimiento
    // de Rutina" el que se adelantaba con el mismo criterio).
    if (profile?.dailyRoutineFavorite ?? true) defaultOrder.push(dailyRoutineCard);
    if (profile?.financeFavorite ?? true) {
      defaultOrder.push({ key: 'finance', kind: 'finance', title: 'Finanzas', typeLabel: 'resumen' });
    }
    if (profile?.moodFavorite ?? true) {
      defaultOrder.push({ key: 'mood', kind: 'mood', title: 'Mood tracker', typeLabel: 'ánimo' });
    }
    if (profile?.gymFavorite ?? true) {
      defaultOrder.push({ key: 'gym', kind: 'gym', title: 'Gimnasio', typeLabel: 'rutina' });
    }
    if (trackersCard) defaultOrder.push(trackersCard);
    if (listsCard) defaultOrder.push(listsCard);

    const byKey = new Map<string, FavoriteCard>(defaultOrder.map((c) => [c.key, c]));
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

  const toggleDailyRoutineFavorite = useCallback(async () => {
    const shown = cards.some((c) => c.kind === 'dailyRoutine');
    await container.updateUserProfile.execute({ dailyRoutineFavorite: !shown });
    await reload();
  }, [cards, reload]);

  const toggleDailyRoutineTask = useCallback(
    async (item: DailyRoutineTaskStatus) => {
      await container.setDailyTaskDone.execute(item.task.id, !item.done);
      // Mismo resync que hace useDailyRoutines al recargar: mantiene al día
      // el color de "Seguimiento de Rutina" aunque se tilde desde acá.
      const freshSession = await container.getDailyRoutineSession.execute();
      await container.syncRoutineTracker.execute(freshSession.doneCount, freshSession.total);
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
    balance,
    cards,
    loading,
    isEmpty: !loading && cards.length === 0,
    reloadTick,
    reorderMode,
    toggleReorder: () => setReorderMode((v) => !v),
    move,
    entryTarget,
    openAddEntry: setEntryTarget,
    closeEntryModal: () => setEntryTarget(null),
    saveEntry,
    toggleListFavorite,
    toggleFinanceFavorite,
    toggleDailyRoutineFavorite,
    toggleDailyRoutineTask,
    reload,
  };
}
