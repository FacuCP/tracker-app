import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { container } from '../../../core/di/container';
import { GymSession, GymSessionExercise } from '../../../domain/gym/entities/GymSession';
import { GymExerciseDraft } from '../components/GymExerciseModal';

/**
 * ViewModel del detalle de una rutina: sus ejercicios (con el progreso del
 * ciclo actual resuelto), agregar/editar/borrar ejercicio, sumar/restar series
 * directo desde la fila, reordenar ejercicios (modo "Ordenar"), resetear el
 * progreso de la rutina y borrar la rutina.
 */
export function useGymRoutineDetail(routineId: string) {
  const [session, setSession] = useState<GymSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GymSessionExercise | null>(null);
  const [reorderMode, setReorderMode] = useState(false);

  const reload = useCallback(async () => {
    const result = await container.getGymSession.execute(routineId);
    setSession(result);
    setLoading(false);
  }, [routineId]);

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

  const changeSet = useCallback(
    async (item: GymSessionExercise, delta: 1 | -1) => {
      await container.setGymSetCount.execute(routineId, item.exercise.id, item.completedSets + delta);
      await reload();
    },
    [routineId, reload],
  );

  const saveExercise = useCallback(
    async (draft: GymExerciseDraft) => {
      await container.saveGymExercise.execute({
        id: editing?.exercise.id,
        routineId,
        name: draft.name,
        sets: draft.sets,
        reps: draft.reps,
        weightKg: draft.weightKg,
        position: editing?.exercise.position,
      });
      setFormOpen(false);
      setEditing(null);
      await reload();
    },
    [editing, routineId, reload],
  );

  const deleteExercise = useCallback(async () => {
    if (!editing) return;
    await container.deleteGymExercise.execute(routineId, editing.exercise.id);
    setEditing(null);
    setFormOpen(false);
    await reload();
  }, [editing, routineId, reload]);

  const moveExercise = useCallback(
    (exerciseId: string, direction: 'up' | 'down') => {
      setSession((prev) => {
        if (!prev) return prev;
        const exercises = prev.exercises;
        const i = exercises.findIndex((e) => e.exercise.id === exerciseId);
        const j = direction === 'up' ? i - 1 : i + 1;
        if (i < 0 || j < 0 || j >= exercises.length) return prev;

        const next = exercises.slice();
        [next[i], next[j]] = [next[j], next[i]];
        container.reorderGymExercises
          .execute(routineId, next.map((e) => e.exercise.id))
          .then(reload)
          .catch(() => {});
        return { ...prev, exercises: next };
      });
    },
    [routineId, reload],
  );

  const resetRoutine = useCallback(async () => {
    await container.resetGymRoutineProgress.execute(routineId);
    await reload();
  }, [routineId, reload]);

  const deleteRoutine = useCallback(async () => {
    await container.deleteGymRoutine.execute(routineId);
  }, [routineId]);

  return {
    routine: session?.routine ?? null,
    exercises: session?.exercises ?? [],
    routineDone: session?.routineDone ?? false,
    loading,
    formOpen,
    openNewExercise: () => {
      setEditing(null);
      setFormOpen(true);
    },
    editing,
    openEditExercise: (item: GymSessionExercise) => {
      setEditing(item);
      setFormOpen(true);
    },
    closeForm: () => {
      setFormOpen(false);
      setEditing(null);
    },
    addSet: (item: GymSessionExercise) => changeSet(item, 1),
    removeSet: (item: GymSessionExercise) => changeSet(item, -1),
    saveExercise,
    deleteExercise,
    reorderMode,
    toggleReorder: () => setReorderMode((v) => !v),
    moveExercise,
    resetRoutine,
    deleteRoutine,
  };
}
