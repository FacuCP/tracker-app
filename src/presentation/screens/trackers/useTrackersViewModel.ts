import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { container } from '../../../core/di/container';
import { ROUTINE_TRACKER_ID } from '../../../domain/dailyRoutine/usecases/SyncRoutineTracker';
import { Tracker } from '../../../domain/tracker/entities/Tracker';

/**
 * ViewModel de la pantalla principal (Trackers): resuelve el saludo (con el
 * nombre del usuario) y la lista de trackers. Ambos se recargan al volver a la
 * pantalla, por si se cambió el nombre en Ajustes o se creó/borró un tracker.
 * "Seguimiento de Rutina" se excluye: es de uso interno, solo se ve dentro de
 * "Rutina diaria" (ver `useFavorites`, que hace lo mismo para su carrusel).
 */
export function useTrackersViewModel() {
  const [greeting, setGreeting] = useState('');
  const [trackers, setTrackers] = useState<Tracker[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        container.getWelcomeMessage.execute(),
        container.getTrackers.execute(),
      ]).then(([message, list]) => {
        if (active) {
          setGreeting(message);
          setTrackers(list.filter((t) => t.id !== ROUTINE_TRACKER_ID));
        }
      });
      return () => {
        active = false;
      };
    }, []),
  );

  return { greeting, trackers };
}
