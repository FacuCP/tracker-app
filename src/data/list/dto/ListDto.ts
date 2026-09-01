import { IsoDate } from '../../../core/utils/date';
import { List, createList } from '../../../domain/list/entities/List';

export interface ListDto {
  id: string;
  name: string;
  createdAt: string;
}

export function listToDto(list: List): ListDto {
  return { id: list.id, name: list.name, createdAt: list.createdAt };
}

export function listFromDto(dto: ListDto): List {
  return createList({
    id: dto.id,
    name: dto.name,
    createdAt: (dto.createdAt ?? '1970-01-01') as IsoDate,
  });
}
