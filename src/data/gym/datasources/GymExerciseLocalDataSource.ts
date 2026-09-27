import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../../core/storage/keys';
import { GymExerciseDto } from '../dto/GymExerciseDto';

/**
 * Fuente de datos local de los ejercicios. Blob JSON anidado:
 * { [routineId]: { [exerciseId]: GymExerciseDto } }.
 */
export interface GymExerciseLocalDataSource {
  readAll(): Promise<Record<string, Record<string, GymExerciseDto>>>;
  write(exercise: GymExerciseDto): Promise<void>;
  writeMany(exercises: GymExerciseDto[]): Promise<void>;
  remove(routineId: string, exerciseId: string): Promise<void>;
  removeRoutine(routineId: string): Promise<void>;
}

const STORAGE_KEY = STORAGE_KEYS.gymExercises;

export class AsyncStorageGymExerciseLocalDataSource implements GymExerciseLocalDataSource {
  async readAll(): Promise<Record<string, Record<string, GymExerciseDto>>> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
      return (JSON.parse(raw) as Record<string, Record<string, GymExerciseDto>>) ?? {};
    } catch {
      return {};
    }
  }

  private async persist(all: Record<string, Record<string, GymExerciseDto>>): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  async write(exercise: GymExerciseDto): Promise<void> {
    const all = await this.readAll();
    const forRoutine = all[exercise.routineId] ?? {};
    forRoutine[exercise.id] = exercise;
    all[exercise.routineId] = forRoutine;
    await this.persist(all);
  }

  async writeMany(exercises: GymExerciseDto[]): Promise<void> {
    if (exercises.length === 0) return;
    const all = await this.readAll();
    for (const exercise of exercises) {
      const forRoutine = all[exercise.routineId] ?? {};
      forRoutine[exercise.id] = exercise;
      all[exercise.routineId] = forRoutine;
    }
    await this.persist(all);
  }

  async remove(routineId: string, exerciseId: string): Promise<void> {
    const all = await this.readAll();
    if (all[routineId]) {
      delete all[routineId][exerciseId];
      await this.persist(all);
    }
  }

  async removeRoutine(routineId: string): Promise<void> {
    const all = await this.readAll();
    if (all[routineId]) {
      delete all[routineId];
      await this.persist(all);
    }
  }
}
