import { IsoDate } from '../../../core/utils/date';
import { MoodEntry } from '../../../domain/mood/entities/MoodEntry';
import { MoodRepository } from '../../../domain/mood/repositories/MoodRepository';
import { MoodLocalDataSource } from '../datasources/MoodLocalDataSource';
import { moodEntryFromDto, moodEntryToDto } from '../dto/MoodEntryDto';

/**
 * Implementa el puerto MoodRepository sobre una fuente de datos local.
 * Traduce entre DTOs (persistencia) y entidades (dominio).
 */
export class MoodRepositoryImpl implements MoodRepository {
  constructor(private readonly local: MoodLocalDataSource) {}

  async getEntry(date: IsoDate): Promise<MoodEntry | null> {
    const all = await this.local.readAll();
    const dto = all[date];
    return dto ? moodEntryFromDto(dto) : null;
  }

  async getEntriesInRange(start: IsoDate, end: IsoDate): Promise<MoodEntry[]> {
    const all = await this.local.readAll();
    return Object.values(all)
      .filter((dto) => dto.date >= start && dto.date <= end)
      .map(moodEntryFromDto)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async saveEntry(entry: MoodEntry): Promise<void> {
    await this.local.write(moodEntryToDto(entry));
  }

  async deleteEntry(date: IsoDate): Promise<void> {
    await this.local.remove(date);
  }
}
