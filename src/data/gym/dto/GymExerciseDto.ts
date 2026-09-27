import { GymExercise, createGymExercise } from '../../../domain/gym/entities/GymExercise';

export interface GymExerciseDto {
  id: string;
  routineId: string;
  name: string;
  sets: number;
  reps: number | null;
  weightKg: number;
  position: number;
}

export function gymExerciseToDto(exercise: GymExercise): GymExerciseDto {
  return {
    id: exercise.id,
    routineId: exercise.routineId,
    name: exercise.name,
    sets: exercise.sets,
    reps: exercise.reps,
    weightKg: exercise.weightKg,
    position: exercise.position,
  };
}

export function gymExerciseFromDto(dto: GymExerciseDto): GymExercise {
  return createGymExercise({
    id: dto.id,
    routineId: dto.routineId,
    name: dto.name,
    sets: dto.sets,
    reps: dto.reps,
    weightKg: dto.weightKg ?? 0,
    position: dto.position,
  });
}
