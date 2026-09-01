import { Tracker } from '../../../domain/tracker/entities/Tracker';
import { TrackerRepository } from '../../../domain/tracker/repositories/TrackerRepository';
import { TrackerLocalDataSource } from '../datasources/TrackerLocalDataSource';
import { trackerFromDto, trackerToDto } from '../dto/TrackerDto';

export class TrackerRepositoryImpl implements TrackerRepository {
  constructor(private readonly local: TrackerLocalDataSource) {}

  async getAll(): Promise<Tracker[]> {
    const all = await this.local.readAll();
    return Object.values(all).map(trackerFromDto);
  }

  async getById(id: string): Promise<Tracker | null> {
    const all = await this.local.readAll();
    const dto = all[id];
    return dto ? trackerFromDto(dto) : null;
  }

  async save(tracker: Tracker): Promise<void> {
    await this.local.write(trackerToDto(tracker));
  }

  async delete(id: string): Promise<void> {
    await this.local.remove(id);
  }
}
