import { GymRoutine } from '../../../domain/gym/entities/GymRoutine';
import { GymRoutineRepository } from '../../../domain/gym/repositories/GymRoutineRepository';
import { GymRoutineLocalDataSource } from '../datasources/GymRoutineLocalDataSource';
import { gymRoutineFromDto, gymRoutineToDto } from '../dto/GymRoutineDto';

export class GymRoutineRepositoryImpl implements GymRoutineRepository {
  constructor(private readonly local: GymRoutineLocalDataSource) {}

  async getAll(): Promise<GymRoutine[]> {
    const all = await this.local.readAll();
    return Object.values(all).map(gymRoutineFromDto);
  }

  async getById(id: string): Promise<GymRoutine | null> {
    const all = await this.local.readAll();
    const dto = all[id];
    return dto ? gymRoutineFromDto(dto) : null;
  }

  async save(routine: GymRoutine): Promise<void> {
    await this.local.write(gymRoutineToDto(routine));
  }

  async delete(id: string): Promise<void> {
    await this.local.remove(id);
  }
}
