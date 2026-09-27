import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { container } from '../../../core/di/container';
import { GymRoutine } from '../../../domain/gym/entities/GymRoutine';

export interface GymRoutineSummary {
  total: number;
  doneThisWeek: boolean;
}

/** ViewModel del hub de Gimnasio: el saludo, las rutinas y crear una nueva. */
export function useGymScreen() {
  const [greeting, setGreeting] = useState('');
  const [routines, setRoutines] = useState<GymRoutine[]>([]);
  const [summaries, setSummaries] = useState<Record<string, GymRoutineSummary>>({});
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const reload = useCallback(async () => {
    const [message, allRoutines] = await Promise.all([
      container.getWelcomeMessage.execute(),
      container.getGymRoutines.execute(),
    ]);
    const nextSummaries: Record<string, GymRoutineSummary> = {};
    await Promise.all(
      allRoutines.map(async (routine) => {
        const session = await container.getGymSession.execute(routine.id);
        nextSummaries[routine.id] = {
          total: session?.exercises.length ?? 0,
          doneThisWeek: session?.routineDone ?? false,
        };
      }),
    );
    setGreeting(message);
    setRoutines(allRoutines);
    setSummaries(nextSummaries);
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

  const createRoutine = useCallback(
    async (name: string) => {
      await container.createGymRoutine.execute(name);
      setCreateOpen(false);
      await reload();
    },
    [reload],
  );

  return {
    greeting,
    routines,
    summaries,
    loading,
    createOpen,
    openCreate: () => setCreateOpen(true),
    closeCreate: () => setCreateOpen(false),
    createRoutine,
  };
}
