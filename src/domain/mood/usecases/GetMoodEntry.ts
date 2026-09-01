import { IsoDate } from '../../../core/utils/date';
import { MoodEntry } from '../entities/MoodEntry';
import { MoodRepository } from '../repositories/MoodRepository';

/** Devuelve el registro de ánimo de un día, o null si ese día no tiene. */
export class GetMoodEntry {
  constructor(private readonly repository: MoodRepository) {}

  execute(date: IsoDate): Promise<MoodEntry | null> {
    return this.repository.getEntry(date);
  }
}
