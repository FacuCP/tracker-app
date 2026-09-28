import { GymExercise, createGymExercise } from '../../../domain/gym/entities/GymExercise';

export interface GymExerciseDto {
  id: string;
  routineId: string;
  name: string;
  sets: number;
  reps: number | null;
  isTimed?: boolean;
  weightKg: number;
  position: number;
  description?: string;
}

export function gymExerciseToDto(exercise: GymExercise): GymExerciseDto {
  return {
    id: exercise.id,
    routineId: exercise.routineId,
    name: exercise.name,
    sets: exercise.sets,
    reps: exercise.reps,
    isTimed: exercise.isTimed,
    weightKg: exercise.weightKg,
    position: exercise.position,
    description: exercise.description,
  };
}

export function gymExerciseFromDto(dto: GymExerciseDto): GymExercise {
  return createGymExercise({
    id: dto.id,
    routineId: dto.routineId,
    name: dto.name,
    sets: dto.sets,
    reps: dto.reps,
    isTimed: dto.isTimed ?? false,
    weightKg: dto.weightKg ?? 0,
    position: dto.position,
    description: dto.description,
  });
}
