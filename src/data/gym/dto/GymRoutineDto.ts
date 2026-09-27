import { IsoDate } from '../../../core/utils/date';
import { GymRoutine, createGymRoutine } from '../../../domain/gym/entities/GymRoutine';

export interface GymRoutineDto {
  id: string;
  name: string;
  createdAt: string;
}

export function gymRoutineToDto(routine: GymRoutine): GymRoutineDto {
  return { id: routine.id, name: routine.name, createdAt: routine.createdAt };
}

export function gymRoutineFromDto(dto: GymRoutineDto): GymRoutine {
  return createGymRoutine({
    id: dto.id,
    name: dto.name,
    createdAt: (dto.createdAt ?? '1970-01-01') as IsoDate,
  });
}
