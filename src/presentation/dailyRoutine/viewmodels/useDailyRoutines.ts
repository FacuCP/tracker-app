import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { container } from '../../../core/di/container';
import { Tracker } from '../../../domain/tracker/entities/Tracker';
import { TrackerEntry } from '../../../domain/tracker/entities/TrackerEntry';
import {
  DailyRoutineSession,
  DailyRoutineTaskStatus,
} from '../../../domain/dailyRoutine/usecases/GetDailyRoutineSession';
import { ROUTINE_TRACKER_ID } from '../../../domain/dailyRoutine/usecases/SyncRoutineTracker';
import { useCalendarPeriod } from '../../calendar/useCalendarPeriod';
import { DailyRoutineTaskDraft } from '../components/DailyRoutineTaskModal';

const EMPTY_SESSION: DailyRoutineSession = { tasks: [], doneCount: 0, total: 0 };

/**
 * ViewModel de "Rutina diaria": las tareas de hoy con su progreso resuelto,
 * crear/editar/borrar tarea, tildar/destildar, y el seguimiento ("Seguimiento
 * de Rutina") con semana/mes/año como el resto de los trackers — se
 * resincroniza solo en cada recarga, sin esperar un "cierre de día".
 */
export function useDailyRoutines() {
  const period = useCalendarPeriod();
  const [session, setSession] = useState<DailyRoutineSession>(EMPTY_SESSION);
  const [tracker, setTracker] = useState<Tracker | null>(null);
  const [entriesByDate, setEntriesByDate] = useState<Record<string, TrackerEntry>>({});
  const [optionCounts, setOptionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DailyRoutineTaskStatus | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [favorite, setFavorite] = useState(true);

  const { startIso, endIso } = period.range;

  const reload = useCallback(async () => {
    const [freshSession, profile] = await Promise.all([
      container.getDailyRoutineSession.execute(),
      container.getUserProfile.execute(),
    ]);
    setSession(freshSession);
    setFavorite(profile?.dailyRoutineFavorite ?? true);

    // Idempotente: resincroniza el color de hoy con el progreso actual cada
    // vez que se recarga, en vez de esperar un "cierre de día" que no existe.
    await container.syncRoutineTracker.execute(freshSession.doneCount, freshSession.total);

    const routineTracker = await container.getTracker.execute(ROUTINE_TRACKER_ID);
    setTracker(routineTracker);

    const range = await container.getTrackerRange.execute(ROUTINE_TRACKER_ID, startIso, endIso);
    setEntriesByDate(range.entriesByDate);
    setOptionCounts(range.optionCounts);
    setLoading(false);
  }, [startIso, endIso]);

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

  const toggleTask = useCallback(
    async (item: DailyRoutineTaskStatus) => {
      await container.setDailyTaskDone.execute(item.task.id, !item.done);
      await reload();
    },
    [reload],
  );

  // Única forma de volver a agregar "Rutina diaria" a Favoritos si se sacó
  // de ahí — es la única card sin una pantalla propia con su propia
  // estrella, así que la estrella vive acá (al lado de "Ordenar").
  const toggleFavorite = useCallback(async () => {
    await container.updateUserProfile.execute({ dailyRoutineFavorite: !favorite });
    await reload();
  }, [favorite, reload]);

  const saveTask = useCallback(
    async (draft: DailyRoutineTaskDraft) => {
      await container.saveDailyRoutineTask.execute({
        id: editing?.task.id,
        title: draft.title,
        description: draft.description,
      });
      setFormOpen(false);
      setEditing(null);
      await reload();
    },
    [editing, reload],
  );

  const deleteTask = useCallback(async () => {
    if (!editing) return;
    await container.deleteDailyRoutineTask.execute(editing.task.id);
    setEditing(null);
    setFormOpen(false);
    await reload();
  }, [editing, reload]);

  const moveTask = useCallback(
    (taskId: string, direction: 'up' | 'down') => {
      setSession((prev) => {
        const tasks = prev.tasks;
        const i = tasks.findIndex((t) => t.task.id === taskId);
        const j = direction === 'up' ? i - 1 : i + 1;
        if (i < 0 || j < 0 || j >= tasks.length) return prev;

        const next = tasks.slice();
        [next[i], next[j]] = [next[j], next[i]];
        container.reorderDailyRoutineTasks
          .execute(next.map((t) => t.task.id))
          .then(reload)
          .catch(() => {});
        return { ...prev, tasks: next };
      });
    },
    [reload],
  );

  return {
    tasks: session.tasks,
    doneCount: session.doneCount,
    total: session.total,
    tracker,
    entriesByDate,
    optionCounts,
    period,
    loading,
    formOpen,
    editing,
    openNewTask: () => {
      setEditing(null);
      setFormOpen(true);
    },
    openEditTask: (item: DailyRoutineTaskStatus) => {
      setEditing(item);
      setFormOpen(true);
    },
    closeForm: () => {
      setFormOpen(false);
      setEditing(null);
    },
    toggleTask,
    saveTask,
    deleteTask,
    reorderMode,
    toggleReorder: () => setReorderMode((v) => !v),
    moveTask,
    favorite,
    toggleFavorite,
  };
}
