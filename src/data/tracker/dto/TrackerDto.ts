import { IsoDate } from '../../../core/utils/date';
import { Tracker, TrackerKind, createTracker } from '../../../domain/tracker/entities/Tracker';

export interface TrackerOptionDto {
  id: string;
  label: string;
  color: string;
}

export interface TrackerDto {
  id: string;
  name: string;
  kind: string;
  options: TrackerOptionDto[];
  createdAt: string;
  favorite?: boolean;
}

export function trackerToDto(tracker: Tracker): TrackerDto {
  return {
    id: tracker.id,
    name: tracker.name,
    kind: tracker.kind,
    options: tracker.options.map((o) => ({ id: o.id, label: o.label, color: o.color })),
    createdAt: tracker.createdAt,
    favorite: tracker.favorite || undefined,
  };
}

export function trackerFromDto(dto: TrackerDto): Tracker {
  const kind: TrackerKind = dto.kind === 'number' ? 'number' : 'options';
  return createTracker({
    id: dto.id,
    name: dto.name,
    kind,
    options: kind === 'options' ? (dto.options ?? []) : [],
    createdAt: (dto.createdAt ?? '1970-01-01') as IsoDate,
    favorite: dto.favorite ?? false,
  });
}
