import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { container } from '../../../core/di/container';
import { Tracker } from '../../../domain/tracker/entities/Tracker';

/**
 * ViewModel del home: resuelve el saludo de bienvenida y la lista de trackers
 * del usuario (que se recarga al volver a la pantalla, por si se creó o borró
 * alguno).
 */
export function useHomeViewModel() {
  const [greeting, setGreeting] = useState('');
  const [trackers, setTrackers] = useState<Tracker[]>([]);

  useEffect(() => {
    let active = true;
    container.getWelcomeMessage.execute().then((result) => {
      if (active) setGreeting(result);
    });
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      container.getTrackers.execute().then((list) => {
        if (active) setTrackers(list);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  return { greeting, trackers };
}
