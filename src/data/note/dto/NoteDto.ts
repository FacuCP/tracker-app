import { IsoDate } from '../../../core/utils/date';
import { Note, createNote } from '../../../domain/note/entities/Note';

export interface NoteDto {
  id: string;
  name: string;
  createdAt: string;
  favorite?: boolean;
}

export function noteToDto(note: Note): NoteDto {
  return {
    id: note.id,
    name: note.name,
    createdAt: note.createdAt,
    favorite: note.favorite || undefined,
  };
}

export function noteFromDto(dto: NoteDto): Note {
  return createNote({
    id: dto.id,
    name: dto.name,
    createdAt: (dto.createdAt ?? '1970-01-01') as IsoDate,
    favorite: dto.favorite ?? false,
  });
}
