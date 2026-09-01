import { IsoDate } from '../../../core/utils/date';
import { TrackerEntry } from '../../../domain/tracker/entities/TrackerEntry';

export interface TrackerEntryDto {
  trackerId: string;
  date: string;
  optionId?: string;
  value?: number;
}

export function trackerEntryToDto(entry: TrackerEntry): TrackerEntryDto {
  return {
    trackerId: entry.trackerId,
    date: entry.date,
    optionId: entry.optionId,
    value: entry.value,
  };
}

export function trackerEntryFromDto(dto: TrackerEntryDto): TrackerEntry {
  return {
    trackerId: dto.trackerId,
    date: dto.date as IsoDate,
    optionId: dto.optionId,
    value: dto.value,
  };
}
