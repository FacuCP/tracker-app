import { TrackerRepository } from '../repositories/TrackerRepository';

/** Marca o desmarca un tracker como favorito. */
export class SetTrackerFavorite {
  constructor(private readonly repository: TrackerRepository) {}

  async execute(id: string, favorite: boolean): Promise<void> {
    const tracker = await this.repository.getById(id);
    if (!tracker) {
      throw new Error('El tracker no existe');
    }
    await this.repository.save({ ...tracker, favorite });
  }
}
