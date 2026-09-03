import React, { useSyncExternalStore } from 'react';
import { StyleSheet, Text } from 'react-native';

/**
 * Escala global de la tipografía. Se parchea `Text.render` una sola vez para
 * multiplicar el `fontSize` de cada texto que tenga uno explícito (los textos
 * anidados sin tamaño propio siguen heredando el del padre, ya escalado).
 *
 * El valor lo fija el perfil del usuario (Ajustes). Cambiarlo re-renderiza
 * desde la raíz; cada pantalla termina de ajustarse al recibir el foco.
 */
let scale = 1;
const listeners = new Set<() => void>();

export function getAppFontScale(): number {
  return scale;
}

export function setAppFontScale(next: number): void {
  const clamped = Number.isFinite(next) ? next : 1;
  if (clamped === scale) return;
  scale = clamped;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Se re-renderiza cuando cambia la escala. Úsalo en un componente alto del árbol. */
export function useAppFontScale(): number {
  return useSyncExternalStore(subscribe, getAppFontScale, getAppFontScale);
}

const TextAny = Text as unknown as {
  render?: (...args: unknown[]) => React.ReactElement | null;
};

if (typeof TextAny.render === 'function' && !(TextAny.render as { __scaled?: boolean }).__scaled) {
  const original = TextAny.render;
  const patched = function patchedRender(this: unknown, ...args: unknown[]) {
    const element = original.apply(this, args);
    if (scale === 1 || !element) return element;
    const flat = StyleSheet.flatten(
      (element.props as { style?: unknown }).style as never,
    ) as { fontSize?: number } | undefined;
    if (!flat || typeof flat.fontSize !== 'number') return element;
    return React.cloneElement(element, {
      style: [(element.props as { style?: unknown }).style, { fontSize: flat.fontSize * scale }],
    } as never);
  } as typeof original & { __scaled?: boolean };
  patched.__scaled = true;
  TextAny.render = patched;
}
