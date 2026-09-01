import { IsoDate } from '../../../core/utils/date';
import { isMoodColor, MoodColor } from '../../../domain/mood/entities/MoodColor';
import { MoodEntry, createMoodEntry } from '../../../domain/mood/entities/MoodEntry';

/**
 * Forma serializable de un MoodEntry, tal cual se guarda en el storage.
 * Separar el DTO de la entidad permite cambiar el formato de persistencia
 * sin tocar el dominio.
 */
export interface MoodEntryDto {
  date: string;
  colors: string[];
  description?: string;
  note?: number;
}

export function moodEntryToDto(entry: MoodEntry): MoodEntryDto {
  return {
    date: entry.date,
    colors: [...entry.colors],
    description: entry.description,
    note: entry.note,
  };
}

export function moodEntryFromDto(dto: MoodEntryDto): MoodEntry {
  const colors = (dto.colors ?? []).filter((c): c is MoodColor => isMoodColor(c));
  return createMoodEntry({
    date: dto.date as IsoDate,
    colors,
    description: dto.description,
    note: dto.note,
  });
}
