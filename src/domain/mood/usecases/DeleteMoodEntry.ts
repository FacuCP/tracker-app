import { IsoDate } from '../../../core/utils/date';
import { MoodRepository } from '../repositories/MoodRepository';

/** Borra el registro de ánimo de un día. */
export class DeleteMoodEntry {
  constructor(private readonly repository: MoodRepository) {}

  execute(date: IsoDate): Promise<void> {
    return this.repository.deleteEntry(date);
  }
}
