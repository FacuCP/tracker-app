import { IsoDate } from '../../../core/utils/date';

/**
 * Cómo termina la repetición de un evento:
 *  - `never`: indefinida.
 *  - `onDate`: hasta (e incluyendo) `endDate`.
 *  - `afterCount`: después de `count` ocurrencias en total (contando la primera).
 */
export type EventRepeatEndType = 'never' | 'onDate' | 'afterCount';

/** Unidad del intervalo de repetición: cada cuántos días, o cada cuántos meses. */
export type EventRepeatUnit = 'days' | 'months';

export interface EventRepeat {
  /** Cada cuántas unidades (`intervalUnit`) se repite (>= 1). */
  readonly intervalValue: number;
  readonly intervalUnit: EventRepeatUnit;
  readonly endType: EventRepeatEndType;
  readonly endDate?: IsoDate;
  readonly count?: number;
}

/** Un evento del calendario: nombre, fecha + horario opcional, color, y repetición opcional. */
export interface CalendarEvent {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  /** Fecha de la primera (o única) ocurrencia. */
  readonly date: IsoDate;
  /** Horario de inicio en formato 24h "HH:MM", si tiene. */
  readonly timeFrom?: string;
  /** Horario de fin en formato 24h "HH:MM", si tiene. */
  readonly timeTo?: string;
  /** Color hex con el que se pinta la franja del evento en el calendario. */
  readonly color: string;
  /** Si no viene, el evento ocurre una sola vez. */
  readonly repeat?: EventRepeat;
  /**
   * Fechas de ocurrencias puntuales borradas ("solo este día"), para un
   * evento que se repite. No se tocan al editar el evento.
   */
  readonly excludedDates?: readonly IsoDate[];
}

export const MAX_EVENT_NAME = 60;
export const MAX_EVENT_DESCRIPTION = 300;
export const MIN_INTERVAL_VALUE = 1;
export const MAX_INTERVAL_DAYS = 3650;
export const MAX_INTERVAL_MONTHS = 120;
export const MIN_REPEAT_COUNT = 1;
export const MAX_REPEAT_COUNT = 5000;
export const DEFAULT_INTERVAL_DAYS = 7;
export const DEFAULT_INTERVAL_MONTHS = 1;

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

export function createCalendarEvent(params: {
  id: string;
  name: string;
  description?: string;
  date: IsoDate;
  timeFrom?: string;
  timeTo?: string;
  color: string;
  repeat?: {
    intervalValue: number;
    intervalUnit: EventRepeatUnit;
    endType: EventRepeatEndType;
    endDate?: IsoDate;
    count?: number;
  };
  excludedDates?: readonly IsoDate[];
}): CalendarEvent {
  const name = params.name.trim();
  if (name.length === 0) {
    throw new Error('El evento necesita un nombre');
  }
  if (name.length > MAX_EVENT_NAME) {
    throw new Error(`El nombre no puede superar los ${MAX_EVENT_NAME} caracteres`);
  }
  const description = params.description?.trim() || undefined;
  if (description != null && description.length > MAX_EVENT_DESCRIPTION) {
    throw new Error(`La descripción no puede superar los ${MAX_EVENT_DESCRIPTION} caracteres`);
  }
  if (params.timeFrom != null && !TIME_REGEX.test(params.timeFrom)) {
    throw new Error('El horario "desde" tiene que tener el formato HH:MM');
  }
  if (params.timeTo != null && !TIME_REGEX.test(params.timeTo)) {
    throw new Error('El horario "hasta" tiene que tener el formato HH:MM');
  }
  if (!isHexColor(params.color)) {
    throw new Error(`Color de evento inválido: ${params.color}`);
  }

  let repeat: EventRepeat | undefined;
  if (params.repeat) {
    const { intervalValue, intervalUnit, endType } = params.repeat;
    const maxInterval = intervalUnit === 'months' ? MAX_INTERVAL_MONTHS : MAX_INTERVAL_DAYS;
    if (!Number.isInteger(intervalValue) || intervalValue < MIN_INTERVAL_VALUE || intervalValue > maxInterval) {
      throw new Error(
        `El intervalo de repetición tiene que ser un entero entre ${MIN_INTERVAL_VALUE} y ${maxInterval}`,
      );
    }
    if (endType === 'onDate') {
      if (!params.repeat.endDate || params.repeat.endDate < params.date) {
        throw new Error('La fecha de fin tiene que ser posterior a la fecha del evento');
      }
      repeat = { intervalValue, intervalUnit, endType, endDate: params.repeat.endDate };
    } else if (endType === 'afterCount') {
      const count = params.repeat.count;
      if (!count || !Number.isInteger(count) || count < MIN_REPEAT_COUNT || count > MAX_REPEAT_COUNT) {
        throw new Error(`La cantidad de repeticiones tiene que ser un entero entre ${MIN_REPEAT_COUNT} y ${MAX_REPEAT_COUNT}`);
      }
      repeat = { intervalValue, intervalUnit, endType, count };
    } else {
      repeat = { intervalValue, intervalUnit, endType: 'never' };
    }
  }

  const excludedDates =
    params.excludedDates && params.excludedDates.length > 0
      ? [...new Set(params.excludedDates)].sort()
      : undefined;

  return {
    id: params.id,
    name,
    description,
    date: params.date,
    timeFrom: params.timeFrom,
    timeTo: params.timeTo,
    color: params.color,
    repeat,
    excludedDates,
  };
}
