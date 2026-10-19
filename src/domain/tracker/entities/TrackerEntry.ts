import { IsoDate } from '../../../core/utils/date';
import { MAX_OPTIONS_PER_DAY, Tracker, getTrackerOption } from './Tracker';

export const MAX_TRACKER_COMMENT = 300;

/**
 * Registro de un día para un tracker del usuario: hasta dos opciones elegidas
 * (`optionIds`) y/o un número (`value`), según lo que registre el tracker,
 * más un comentario de texto libre opcional.
 */
export interface TrackerEntry {
  readonly trackerId: string;
  readonly date: IsoDate;
  readonly optionIds: readonly string[];
  readonly value?: number;
  readonly comment?: string;
}

export function createTrackerEntry(
  tracker: Tracker,
  params: { date: IsoDate; optionIds?: readonly string[]; value?: number; comment?: string },
): TrackerEntry {
  const seen = new Set<string>();
  const optionIds: string[] = [];
  for (const id of params.optionIds ?? []) {
    if (!seen.has(id) && getTrackerOption(tracker, id)) {
      seen.add(id);
      optionIds.push(id);
    }
    if (optionIds.length >= MAX_OPTIONS_PER_DAY) break;
  }

  let value: number | undefined;
  if (params.value != null) {
    if (!tracker.hasCounter || !Number.isFinite(params.value)) {
      throw new Error('Número inválido para este día');
    }
    value = params.value;
  }

  if (optionIds.length === 0 && value == null) {
    throw new Error('Registrá una opción o un número para este día');
  }

  const comment = params.comment?.trim() || undefined;
  if (comment != null && comment.length > MAX_TRACKER_COMMENT) {
    throw new Error(`El comentario no puede superar los ${MAX_TRACKER_COMMENT} caracteres`);
  }

  return { trackerId: tracker.id, date: params.date, optionIds, value, comment };
}
