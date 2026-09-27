import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { container } from '../../../core/di/container';
import { GymRoutine } from '../../../domain/gym/entities/GymRoutine';
import { GymSession } from '../../../domain/gym/entities/GymSession';

/**
 * ViewModel del cuadro "Seleccionar rutina para hoy": elegir una rutina entre
 * todas las que hay, ir agregando series del ejercicio actual (arranca en 0) y
 * avanzar automáticamente al siguiente cuando se completan sus series. Cuando
 * se terminan todos los ejercicios, la rutina queda marcada como hecha (hasta
 * el reseteo semanal).
 */
export function useGymTodayCard() {
  const [favorite, setFavorite] = useState(true);
  const [routines, setRoutines] = useState<GymRoutine[]>([]);
  const [pickerRoutines, setPickerRoutines] = useState<GymRoutine[]>([]);
  const [doneByRoutine, setDoneByRoutine] = useState<Record<string, boolean>>({});
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [session, setSession] = useState<GymSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const [profile, allRoutines, selectedId] = await Promise.all([
      container.getUserProfile.execute(),
      container.getGymRoutines.execute(),
      container.getGymSelection.execute(),
    ]);
    setFavorite(profile?.gymFavorite ?? true);
    setRoutines(allRoutines);

    const withStatus = await Promise.all(
      allRoutines.map(async (routine) => {
        const routineSession = await container.getGymSession.execute(routine.id);
        return {
          routine,
          exerciseCount: routineSession?.exercises.length ?? 0,
          done: routineSession?.routineDone ?? false,
        };
      }),
    );
    setDoneByRoutine(Object.fromEntries(withStatus.map((r) => [r.routine.id, r.done])));

    // En el desplegable no tiene sentido elegir una rutina sin ejercicios, y
    // las ya completadas esta semana se muestran al final.
    setPickerRoutines(
      withStatus
        .filter((r) => r.exerciseCount > 0)
        .sort((a, b) => Number(a.done) - Number(b.done))
        .map((r) => r.routine),
    );

    if (selectedId) {
      const currentSession = await container.getGymSession.execute(selectedId);
      if (currentSession) {
        setSelectedRoutineId(selectedId);
        setSession(currentSession);
      } else {
        // La rutina elegida ya no existe: limpiamos la selección.
        await container.saveGymSelection.execute(null);
        setSelectedRoutineId(null);
        setSession(null);
      }
    } else {
      setSelectedRoutineId(null);
      setSession(null);
    }
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

  const selectRoutine = useCallback(
    async (routineId: string) => {
      await container.saveGymSelection.execute(routineId);
      await reload();
    },
    [reload],
  );

  const clearRoutine = useCallback(async () => {
    await container.saveGymSelection.execute(null);
    await reload();
  }, [reload]);

  const changeSet = useCallback(
    async (delta: 1 | -1) => {
      if (!session?.currentExercise || !selectedRoutineId) return;
      setBusy(true);
      try {
        await container.setGymSetCount.execute(
          selectedRoutineId,
          session.currentExercise.exercise.id,
          session.currentExercise.completedSets + delta,
        );
        await reload();
      } finally {
        setBusy(false);
      }
    },
    [session, selectedRoutineId, reload],
  );

  const toggleFavorite = useCallback(async () => {
    const next = !favorite;
    setFavorite(next);
    await container.updateUserProfile.execute({ gymFavorite: next });
  }, [favorite]);

  return {
    favorite,
    toggleFavorite,
    routines,
    pickerRoutines,
    doneByRoutine,
    selectedRoutineId,
    session,
    loading,
    busy,
    selectRoutine,
    clearRoutine,
    addSet: () => changeSet(1),
    removeSet: () => changeSet(-1),
  };
}
