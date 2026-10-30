import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { container } from '../../../core/di/container';
import { applyIdOrder } from '../../../core/utils/order';
import { ROUTINE_TRACKER_ID } from '../../../domain/dailyRoutine/usecases/SyncRoutineTracker';
import { Tracker } from '../../../domain/tracker/entities/Tracker';

/**
 * ViewModel de la pantalla principal (Trackers): resuelve el saludo (con el
 * nombre del usuario), la lista de trackers (en el orden manual que guardó
 * el usuario) y el modo de reordenar. Se recarga al volver a la pantalla,
 * por si se cambió el nombre en Ajustes o se creó/borró un tracker.
 * "Seguimiento de Rutina" se excluye: es de uso interno, solo se ve dentro de
 * "Rutina diaria" (ver `useFavorites`, que hace lo mismo para su carrusel).
 */
export function useTrackersViewModel() {
  const [greeting, setGreeting] = useState('');
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [loading, setLoading] = useState(true);
  const [reorderMode, setReorderMode] = useState(false);

  const reload = useCallback(async () => {
    const [message, all, savedOrder] = await Promise.all([
      container.getWelcomeMessage.execute(),
      container.getTrackers.execute(),
      container.getTrackersOrder.execute(),
    ]);
    const visible = all.filter((t) => t.id !== ROUTINE_TRACKER_ID);
    setGreeting(message);
    setTrackers(applyIdOrder(visible, savedOrder));
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

  const move = useCallback((id: string, direction: 'up' | 'down') => {
    setTrackers((prev) => {
      const i = prev.findIndex((t) => t.id === id);
      const j = direction === 'up' ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[i], next[j]] = [next[j], next[i]];
      container.saveTrackersOrder.execute(next.map((t) => t.id)).catch(() => {});
      return next;
    });
  }, []);

  return {
    greeting,
    trackers,
    loading,
    reorderMode,
    toggleReorder: () => setReorderMode((v) => !v),
    move,
    reload,
  };
}
