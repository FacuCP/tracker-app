import { IsoDate } from '../../../core/utils/date';
import { ListEntry, createListEntry } from '../../../domain/list/entities/ListEntry';

export interface ListEntryDto {
  id: string;
  listId: string;
  name: string;
  date: string;
  comment?: string;
  rating?: number;
  done?: boolean;
}

export function listEntryToDto(entry: ListEntry): ListEntryDto {
  return {
    id: entry.id,
    listId: entry.listId,
    name: entry.name,
    date: entry.date,
    comment: entry.comment,
    rating: entry.rating,
    done: entry.done || undefined,
  };
}

export function listEntryFromDto(dto: ListEntryDto): ListEntry {
  return createListEntry({
    id: dto.id,
    listId: dto.listId,
    name: dto.name,
    date: dto.date as IsoDate,
    comment: dto.comment,
    rating: dto.rating,
    done: dto.done ?? false,
  });
}
