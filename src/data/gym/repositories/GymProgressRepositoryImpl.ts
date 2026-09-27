import { GymExerciseProgress } from '../../../domain/gym/entities/GymProgress';
import { GymProgressRepository } from '../../../domain/gym/repositories/GymProgressRepository';
import { GymProgressLocalDataSource } from '../datasources/GymProgressLocalDataSource';
import { gymProgressFromDto, gymProgressToDto } from '../dto/GymProgressDto';

export class GymProgressRepositoryImpl implements GymProgressRepository {
  constructor(private readonly local: GymProgressLocalDataSource) {}

  async getForRoutine(routineId: string): Promise<Record<string, GymExerciseProgress>> {
    const all = await this.local.readAll();
    const forRoutine = all[routineId] ?? {};
    const result: Record<string, GymExerciseProgress> = {};
    for (const [exerciseId, dto] of Object.entries(forRoutine)) {
      result[exerciseId] = gymProgressFromDto(dto);
    }
    return result;
  }

  async save(progress: GymExerciseProgress): Promise<void> {
    await this.local.write(gymProgressToDto(progress));
  }

  async deleteForExercise(routineId: string, exerciseId: string): Promise<void> {
    await this.local.remove(routineId, exerciseId);
  }

  async deleteAllForRoutine(routineId: string): Promise<void> {
    await this.local.removeRoutine(routineId);
  }
}
