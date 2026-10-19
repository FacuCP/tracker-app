import { DailyTaskProgress } from '../../../domain/dailyRoutine/entities/DailyTaskProgress';

export interface DailyTaskProgressDto {
  taskId: string;
  day: string;
  done: boolean;
}

export function dailyTaskProgressToDto(progress: DailyTaskProgress): DailyTaskProgressDto {
  return { taskId: progress.taskId, day: progress.day, done: progress.done };
}

export function dailyTaskProgressFromDto(dto: DailyTaskProgressDto): DailyTaskProgress {
  return { taskId: dto.taskId, day: dto.day, done: dto.done };
}
