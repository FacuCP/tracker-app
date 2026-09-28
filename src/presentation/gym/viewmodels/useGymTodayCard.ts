import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { container } from '../../../core/di/container';
import { adjustWeightKg } from '../../../domain/gym/entities/GymExercise';
import { GymRoutine } from '../../../domain/gym/entities/GymRoutine';
import { GymSession, GymSessionExercise } from '../../../domain/gym/entities/GymSession';

/**
 * ViewModel del cuadro "Seleccionar rutina para hoy": elegir una rutina entre
 * todas las que hay, ir agregando series del ejercicio actual (arranca en 0) y
 * avanzar automáticamente al siguiente cuando se completan sus series. Cuando
 * se terminan todos los ejercicios, la rutina queda marcada como hecha (hasta
 * el reseteo semanal). También permite saltar al siguiente ejercicio sin
 * completarlo y ajustar su peso sin salir del cuadro.
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
  // Ejercicio al que se "saltó" manualmente; si no está seteado (o ya se
  // completó), se muestra el primer ejercicio sin terminar de la rutina.
  const [focusedExerciseId, setFocusedExerciseId] = useState<string | null>(null);

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

  // El ejercicio saltado sigue mostrándose mientras no se complete; si ya se
  // completó (o dejó de existir), se cae de nuevo al primero sin terminar.
  const displayExercise: GymSessionExercise | null =
    (session &&
      focusedExerciseId != null &&
      session.exercises.find((e) => e.exercise.id === focusedExerciseId && !e.done)) ||
    session?.currentExercise ||
    null;

  const selectRoutine = useCallback(
    async (routineId: string) => {
      setFocusedExerciseId(null);
      await container.saveGymSelection.execute(routineId);
      await reload();
    },
    [reload],
  );

  const clearRoutine = useCallback(async () => {
    setFocusedExerciseId(null);
    await container.saveGymSelection.execute(null);
    await reload();
  }, [reload]);

  const changeSet = useCallback(
    async (delta: 1 | -1) => {
      if (!displayExercise || !selectedRoutineId) return;
      setBusy(true);
      try {
        await container.setGymSetCount.execute(
          selectedRoutineId,
          displayExercise.exercise.id,
          displayExercise.completedSets + delta,
        );
        await reload();
      } finally {
        setBusy(false);
      }
    },
    [displayExercise, selectedRoutineId, reload],
  );

  const adjustWeight = useCallback(
    async (delta: number) => {
      if (!displayExercise || !selectedRoutineId) return;
      const { exercise } = displayExercise;
      setBusy(true);
      try {
        await container.saveGymExercise.execute({
          id: exercise.id,
          routineId: selectedRoutineId,
          name: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          isTimed: exercise.isTimed,
          weightKg: adjustWeightKg(exercise.weightKg, delta),
          position: exercise.position,
          description: exercise.description,
        });
        await reload();
      } finally {
        setBusy(false);
      }
    },
    [displayExercise, selectedRoutineId, reload],
  );

  /** Pasa al siguiente ejercicio sin terminar (en orden de puesto, dando la vuelta). */
  const skip = useCallback(() => {
    if (!session || !displayExercise) return;
    const list = session.exercises;
    const total = list.length;
    const currentIndex = list.findIndex((e) => e.exercise.id === displayExercise.exercise.id);
    for (let step = 1; step <= total; step++) {
      const next = list[(currentIndex + step) % total];
      if (!next.done) {
        setFocusedExerciseId(next.exercise.id);
        return;
      }
    }
  }, [session, displayExercise]);

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
    displayExercise,
    loading,
    busy,
    selectRoutine,
    clearRoutine,
    addSet: () => changeSet(1),
    removeSet: () => changeSet(-1),
    adjustWeight,
    skip,
  };
}
