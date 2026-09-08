import { IsoDate } from '../../../core/utils/date';
import { Tracker, createTracker } from '../../../domain/tracker/entities/Tracker';

export interface TrackerOptionDto {
  id: string;
  label: string;
  color: string;
}

export interface TrackerDto {
  id: string;
  name: string;
  /** Legado: 'options' | 'number'. Se sigue leyendo pero ya no se escribe. */
  kind?: string;
  options: TrackerOptionDto[];
  hasCounter?: boolean;
  createdAt: string;
  favorite?: boolean;
}

export function trackerToDto(tracker: Tracker): TrackerDto {
  return {
    id: tracker.id,
    name: tracker.name,
    options: tracker.options.map((o) => ({ id: o.id, label: o.label, color: o.color })),
    hasCounter: tracker.hasCounter || undefined,
    createdAt: tracker.createdAt,
    favorite: tracker.favorite || undefined,
  };
}

export function trackerFromDto(dto: TrackerDto): Tracker {
  const legacyNumber = dto.kind === 'number';
  return createTracker({
    id: dto.id,
    name: dto.name,
    options: legacyNumber ? [] : dto.options ?? [],
    hasCounter: dto.hasCounter ?? legacyNumber,
    createdAt: (dto.createdAt ?? '1970-01-01') as IsoDate,
    favorite: dto.favorite ?? false,
  });
}
