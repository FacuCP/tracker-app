import { IsoDate } from '../../../core/utils/date';
import { Tracker, getTrackerOption } from './Tracker';

/**
 * Registro de un día para un tracker del usuario. Según el tipo del tracker,
 * lleva una opción elegida (`optionId`) o un número (`value`).
 */
export interface TrackerEntry {
  readonly trackerId: string;
  readonly date: IsoDate;
  readonly optionId?: string;
  readonly value?: number;
}

export function createTrackerEntry(
  tracker: Tracker,
  params: { date: IsoDate; optionId?: string; value?: number },
): TrackerEntry {
  if (tracker.kind === 'options') {
    if (!params.optionId || !getTrackerOption(tracker, params.optionId)) {
      throw new Error('Elegí una opción válida para este día');
    }
    return { trackerId: tracker.id, date: params.date, optionId: params.optionId };
  }

  if (params.value == null || !Number.isFinite(params.value)) {
    throw new Error('Ingresá un número válido para este día');
  }
  return { trackerId: tracker.id, date: params.date, value: params.value };
}
