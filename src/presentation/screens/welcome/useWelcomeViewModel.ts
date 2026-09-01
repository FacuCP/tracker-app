import { useEffect, useState } from 'react';

import { container } from '../../../core/di/container';

/**
 * ViewModel de la pantalla de bienvenida. La vista solo consume este hook
 * y no toca casos de uso ni datos directamente.
 */
export function useWelcomeViewModel() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    container.getWelcomeMessage
      .execute()
      .then((result) => {
        if (active) {
          setMessage(result);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return { message, loading };
}
