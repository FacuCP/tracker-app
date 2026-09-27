import { GymExercise } from '../../../domain/gym/entities/GymExercise';
import { GymExerciseRepository } from '../../../domain/gym/repositories/GymExerciseRepository';
import { GymExerciseLocalDataSource } from '../datasources/GymExerciseLocalDataSource';
import { gymExerciseFromDto, gymExerciseToDto } from '../dto/GymExerciseDto';

export class GymExerciseRepositoryImpl implements GymExerciseRepository {
  constructor(private readonly local: GymExerciseLocalDataSource) {}

  async getForRoutine(routineId: string): Promise<GymExercise[]> {
    const all = await this.local.readAll();
    const forRoutine = all[routineId] ?? {};
    return Object.values(forRoutine).map(gymExerciseFromDto);
  }

  async save(exercise: GymExercise): Promise<void> {
    await this.local.write(gymExerciseToDto(exercise));
  }

  async saveMany(exercises: GymExercise[]): Promise<void> {
    await this.local.writeMany(exercises.map(gymExerciseToDto));
  }

  async delete(routineId: string, exerciseId: string): Promise<void> {
    await this.local.remove(routineId, exerciseId);
  }

  async deleteAllForRoutine(routineId: string): Promise<void> {
    await this.local.removeRoutine(routineId);
  }
}
