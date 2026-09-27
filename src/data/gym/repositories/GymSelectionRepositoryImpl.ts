import { GymSelectionRepository } from '../../../domain/gym/repositories/GymSelectionRepository';
import { GymSelectionLocalDataSource } from '../datasources/GymSelectionLocalDataSource';

export class GymSelectionRepositoryImpl implements GymSelectionRepository {
  constructor(private readonly local: GymSelectionLocalDataSource) {}

  getSelectedRoutineId(): Promise<string | null> {
    return this.local.read();
  }

  setSelectedRoutineId(routineId: string | null): Promise<void> {
    return this.local.write(routineId);
  }
}
