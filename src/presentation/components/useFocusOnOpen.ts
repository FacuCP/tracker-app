import { ComponentRef, RefObject, useEffect } from 'react';
import { TextInput } from 'react-native';

/**
 * Enfoca un `TextInput` cuando `open` pasa a `true`, con un doble
 * `requestAnimationFrame` (no uno solo): el panel flotante recién se montó
 * en este mismo render, así que un solo frame puede no alcanzar para que el
 * layout ya esté asentado — un segundo frame da ese margen sin inventar un
 * número de milisegundos a ciegas (a diferencia de `ANDROID_FOCUS_DELAY` en
 * `KeyboardFloatingPanel`, que sí es un número fijo, pero ahí es para otra
 * cosa: esperar el foco de ventana de un `Modal`, que ya no existe desde
 * #131).
 */
export function useFocusOnOpen(open: boolean, ref: RefObject<ComponentRef<typeof TextInput> | null>) {
  useEffect(() => {
    if (!open) return;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        ref.current?.focus();
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [open, ref]);
}
