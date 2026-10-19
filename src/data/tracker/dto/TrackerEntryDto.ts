import { IsoDate } from '../../../core/utils/date';
import { TrackerEntry } from '../../../domain/tracker/entities/TrackerEntry';

export interface TrackerEntryDto {
  trackerId: string;
  date: string;
  /** Legado: una sola opción. Se sigue leyendo. */
  optionId?: string;
  optionIds?: string[];
  value?: number;
  comment?: string;
}

export function trackerEntryToDto(entry: TrackerEntry): TrackerEntryDto {
  return {
    trackerId: entry.trackerId,
    date: entry.date,
    optionIds: entry.optionIds.length > 0 ? [...entry.optionIds] : undefined,
    value: entry.value,
    comment: entry.comment,
  };
}

export function trackerEntryFromDto(dto: TrackerEntryDto): TrackerEntry {
  const optionIds = dto.optionIds ?? (dto.optionId ? [dto.optionId] : []);
  return {
    trackerId: dto.trackerId,
    date: dto.date as IsoDate,
    optionIds,
    value: dto.value,
    comment: dto.comment,
  };
}
