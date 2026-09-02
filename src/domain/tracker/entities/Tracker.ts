import { IsoDate } from '../../../core/utils/date';

/**
 * Un tracker creado por el usuario. Es una versión más simple del mood
 * tracker: tiene un nombre y un tipo, y se registra un solo valor por día.
 */
export type TrackerKind = 'options' | 'number';

export interface TrackerOption {
  readonly id: string;
  readonly label: string;
  /** Color hex con el que se pinta el día que tiene esta opción. */
  readonly color: string;
}

export interface Tracker {
  readonly id: string;
  readonly name: string;
  readonly kind: TrackerKind;
  /** Opciones del tracker (solo para kind 'options'; vacío para 'number'). */
  readonly options: readonly TrackerOption[];
  readonly createdAt: IsoDate;
  /** Si está marcado como favorito (aparece en la pestaña Favoritos). */
  readonly favorite: boolean;
}

export const MIN_OPTIONS = 1;
export const MAX_OPTIONS = 6;
export const MAX_TRACKER_NAME = 40;

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
  kind: TrackerKind;
  options?: readonly TrackerOption[];
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
  const favorite = params.favorite ?? false;

  if (params.kind === 'number') {
    return { id: params.id, name, kind: 'number', options: [], createdAt: params.createdAt, favorite };
  }

  const options = params.options ?? [];
  if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
    throw new Error(`Un tracker de opciones tiene entre ${MIN_OPTIONS} y ${MAX_OPTIONS} opciones`);
  }
  for (const option of options) {
    if (option.label.trim().length === 0) {
      throw new Error('Cada opción necesita un nombre');
    }
    if (!isHexColor(option.color)) {
      throw new Error(`Color de opción inválido: ${option.color}`);
    }
  }
  if (new Set(options.map((o) => o.id)).size !== options.length) {
    throw new Error('Las opciones no pueden repetir id');
  }

  return {
    id: params.id,
    name,
    kind: 'options',
    options: options.map((o) => ({ id: o.id, label: o.label.trim(), color: o.color })),
    createdAt: params.createdAt,
    favorite,
  };
}

export function getTrackerOption(tracker: Tracker, optionId: string): TrackerOption | undefined {
  return tracker.options.find((o) => o.id === optionId);
}
