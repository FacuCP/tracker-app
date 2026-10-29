import { useRef } from 'react';
import { PanGesture, usePanGesture } from 'react-native-gesture-handler';

interface Options {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  /**
   * Gesto(s) con prioridad sobre este: este swipe espera a que fallen antes
   * de activarse (p. ej. el carrusel o el calendario que tiene adentro, para
   * que ganen ellos cuando el toque arranca encima suyo). Sin esto, los
   * `PanResponder` anidados (versión anterior) no se arbitraban de forma
   * confiable: el de la pantalla se quedaba con el gesto aunque arrancara
   * sobre un carrusel/calendario.
   */
  requireToFail?: PanGesture | PanGesture[];
}

const MIN_DISTANCE = 45;
const ACTIVE_OFFSET_X = 18;
/** El gesto tiene que ser claramente más horizontal que vertical (ratio ~1.8, como antes). */
const FAIL_OFFSET_Y = 10;

/**
 * Gesto de swipe horizontal (Gesture Handler) para navegar, sin romper el
 * scroll vertical ni los taps. Devuelve un `PanGesture` para usar con
 * `<GestureDetector gesture={...}>`, no `panHandlers` (eso era la versión
 * basada en `PanResponder`, reemplazada por no arbitrarse bien cuando había
 * uno anidado adentro — ver `requireToFail`).
 */
export function useHorizontalSwipe({ onSwipeLeft, onSwipeRight, requireToFail }: Options): PanGesture {
  // Guardamos los callbacks en un ref para que el gesto (creado una vez por
  // la lib) siempre llame a la versión más nueva.
  const callbacks = useRef({ onSwipeLeft, onSwipeRight });
  callbacks.current = { onSwipeLeft, onSwipeRight };

  return usePanGesture({
    activeOffsetX: [-ACTIVE_OFFSET_X, ACTIVE_OFFSET_X],
    failOffsetY: [-FAIL_OFFSET_Y, FAIL_OFFSET_Y],
    requireToFail,
    onDeactivate: (e) => {
      if (e.canceled) return;
      if (e.translationX <= -MIN_DISTANCE) callbacks.current.onSwipeLeft();
      else if (e.translationX >= MIN_DISTANCE) callbacks.current.onSwipeRight();
    },
  });
}
