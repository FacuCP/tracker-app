import { IsoDate } from '../../../core/utils/date';

/**
 * Un tracker creado por el usuario. Puede registrar por día:
 *  - una o dos **opciones** (si tiene `options`), como el mood tracker, y/o
 *  - un **número** (si `hasCounter`).
 * Tiene que tener al menos una de las dos cosas.
 */
export interface TrackerOption {
  readonly id: string;
  readonly label: string;
  /** Color hex con el que se pinta el día que tiene esta opción. */
  readonly color: string;
}

export interface Tracker {
  readonly id: string;
  readonly name: string;
  /** Opciones del tracker. Vacío = no registra opciones. */
  readonly options: readonly TrackerOption[];
  /** Si registra un número (contador) por día. */
  readonly hasCounter: boolean;
  readonly createdAt: IsoDate;
  /** Si está marcado como favorito (aparece en la pestaña Favoritos). */
  readonly favorite: boolean;
}

export const MIN_OPTIONS = 1;
export const MAX_OPTIONS = 6;
export const MAX_TRACKER_NAME = 40;
/** Cuántas opciones se pueden elegir por día (como el mood tracker). */
export const MAX_OPTIONS_PER_DAY = 2;

/** Opciones por defecto de un tracker de opciones nuevo: Sí (verde) / No (rojo). */
export const DEFAULT_OPTIONS: readonly { label: string; color: string }[] = [
  { label: 'Sí', color: '#22C55E' },
  { label: 'No', color: '#E5484D' },
];

function isHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

export function createTracker(params: {
  id: string;
  name: string;
  options?: readonly TrackerOption[];
  hasCounter?: boolean;
  createdAt: IsoDate;
  favorite?: boolean;
}): Tracker {
  const name = params.name.trim();
  if (name.length === 0) {
    throw new Error('El tracker necesita un nombre');
  }
  if (name.length > MAX_TRACKER_NAME) {
    throw new Error(`El nombre no puede superar los ${MAX_TRACKER_NAME} caracteres`);
  }

  const rawOptions = params.options ?? [];
  const hasCounter = params.hasCounter ?? false;

  if (rawOptions.length === 0 && !hasCounter) {
    throw new Error('El tracker tiene que registrar opciones y/o un número');
  }

  let options: TrackerOption[] = [];
  if (rawOptions.length > 0) {
    if (rawOptions.length < MIN_OPTIONS || rawOptions.length > MAX_OPTIONS) {
      throw new Error(`Un tracker con opciones tiene entre ${MIN_OPTIONS} y ${MAX_OPTIONS}`);
    }
    for (const option of rawOptions) {
      if (option.label.trim().length === 0) {
        throw new Error('Cada opción necesita un nombre');
      }
      if (!isHexColor(option.color)) {
        throw new Error(`Color de opción inválido: ${option.color}`);
      }
    }
    if (new Set(rawOptions.map((o) => o.id)).size !== rawOptions.length) {
      throw new Error('Las opciones no pueden repetir id');
    }
    options = rawOptions.map((o) => ({ id: o.id, label: o.label.trim(), color: o.color }));
  }

  return {
    id: params.id,
    name,
    options,
    hasCounter,
    createdAt: params.createdAt,
    favorite: params.favorite ?? false,
  };
}

export function trackerHasOptions(tracker: Tracker): boolean {
  return tracker.options.length > 0;
}

export function getTrackerOption(tracker: Tracker, optionId: string): TrackerOption | undefined {
  return tracker.options.find((o) => o.id === optionId);
}
