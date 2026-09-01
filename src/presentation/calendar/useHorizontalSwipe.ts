import { useRef } from 'react';
import { PanResponder } from 'react-native';

interface Options {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

const MIN_DISTANCE = 45;
/** El gesto tiene que ser claramente más horizontal que vertical. */
const HORIZONTAL_RATIO = 1.8;

/**
 * Devuelve `panHandlers` para detectar swipes horizontales sin romper el
 * scroll vertical ni los taps. Solo reclama el gesto cuando el movimiento es
 * claramente horizontal, así que se puede poner sobre un calendario dentro de
 * un ScrollView.
 */
export function useHorizontalSwipe({ onSwipeLeft, onSwipeRight }: Options) {
  // Guardamos los callbacks en un ref para que el PanResponder (creado una vez)
  // siempre llame a la versión más nueva.
  const callbacks = useRef({ onSwipeLeft, onSwipeRight });
  callbacks.current = { onSwipeLeft, onSwipeRight };

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        Math.abs(gesture.dx) > 18 &&
        Math.abs(gesture.dx) > Math.abs(gesture.dy) * HORIZONTAL_RATIO,
      onPanResponderRelease: (_evt, gesture) => {
        if (gesture.dx <= -MIN_DISTANCE) {
          callbacks.current.onSwipeLeft();
        } else if (gesture.dx >= MIN_DISTANCE) {
          callbacks.current.onSwipeRight();
        }
      },
    }),
  ).current;

  return responder.panHandlers;
}
