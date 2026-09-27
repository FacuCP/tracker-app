import { IsoDate } from '../../../core/utils/date';
import { GymExerciseProgress } from '../../../domain/gym/entities/GymProgress';

export interface GymProgressDto {
  routineId: string;
  exerciseId: string;
  cycleStart: string;
  completedSets: number;
}

export function gymProgressToDto(progress: GymExerciseProgress): GymProgressDto {
  return {
    routineId: progress.routineId,
    exerciseId: progress.exerciseId,
    cycleStart: progress.cycleStart,
    completedSets: progress.completedSets,
  };
}

export function gymProgressFromDto(dto: GymProgressDto): GymExerciseProgress {
  return {
    routineId: dto.routineId,
    exerciseId: dto.exerciseId,
    cycleStart: dto.cycleStart as IsoDate,
    completedSets: dto.completedSets,
  };
}
