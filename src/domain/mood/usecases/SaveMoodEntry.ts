import { IsoDate } from '../../../core/utils/date';
import { MoodColor } from '../entities/MoodColor';
import { MoodEntry, createMoodEntry } from '../entities/MoodEntry';
import { MoodRepository } from '../repositories/MoodRepository';

export interface SaveMoodEntryInput {
  date: IsoDate;
  colors: readonly MoodColor[];
  description?: string;
  note?: number;
}

/**
 * Crea o actualiza el registro de ánimo de un día. Valida las reglas de la
 * entidad (1 o 2 colores sin repetir, nota entre 1 y 10) antes de persistir.
 */
export class SaveMoodEntry {
  constructor(private readonly repository: MoodRepository) {}

  async execute(input: SaveMoodEntryInput): Promise<MoodEntry> {
    const entry = createMoodEntry(input);
    await this.repository.saveEntry(entry);
    return entry;
  }
}
