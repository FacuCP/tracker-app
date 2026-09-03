import { ComponentType, createElement, useSyncExternalStore } from 'react';
import { StyleSheet } from 'react-native';

/**
 * Escala global de la tipografía. En esta versión de RN `Text` es un componente
 * de función común (sin `.render`), así que se reemplaza el `default` de su
 * módulo por un wrapper que multiplica el `fontSize` explícito de cada texto
 * (los anidados sin tamaño propio siguen heredando el del padre, ya escalado).
 *
 * Este archivo tiene que importarse **antes** que cualquier componente que use
 * `Text` (lo hace `App.tsx` en la primera línea).
 */
let scale = 1;
const listeners = new Set<() => void>();

export function getAppFontScale(): number {
  return scale;
}

export function setAppFontScale(next: number): void {
  const value = Number.isFinite(next) ? next : 1;
  if (value === scale) return;
  scale = value;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Se re-renderiza cuando cambia la escala. Úsalo en componentes altos del árbol. */
export function useAppFontScale(): number {
  return useSyncExternalStore(subscribe, getAppFontScale, getAppFontScale);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProps = Record<string, any>;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const textModule = require('react-native/Libraries/Text/Text') as { default?: unknown };
  const Original = textModule.default as ComponentType<AnyProps> & { __scaled?: boolean };

  if (typeof Original === 'function' && !Original.__scaled) {
    const ScaledText = (props: AnyProps) => {
      if (scale === 1) return createElement(Original, props);
      const flat = StyleSheet.flatten(props.style) as { fontSize?: number } | undefined;
      if (!flat || typeof flat.fontSize !== 'number') return createElement(Original, props);
      return createElement(Original, {
        ...props,
        style: [props.style, { fontSize: flat.fontSize * scale }],
      });
    };
    (ScaledText as unknown as { displayName: string }).displayName = 'Text';
    (ScaledText as unknown as { __scaled: boolean }).__scaled = true;
    Object.defineProperty(textModule, 'default', {
      value: ScaledText,
      writable: true,
      configurable: true,
    });
  }
} catch {
  // Si cambia la estructura del módulo de RN, la escala simplemente no aplica.
}
