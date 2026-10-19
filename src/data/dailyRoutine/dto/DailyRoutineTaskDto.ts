import { DailyRoutineTask, createDailyRoutineTask } from '../../../domain/dailyRoutine/entities/DailyRoutineTask';

export interface DailyRoutineTaskDto {
  id: string;
  title: string;
  description?: string;
  position: number;
}

export function dailyRoutineTaskToDto(task: DailyRoutineTask): DailyRoutineTaskDto {
  return { id: task.id, title: task.title, description: task.description, position: task.position };
}

export function dailyRoutineTaskFromDto(dto: DailyRoutineTaskDto): DailyRoutineTask {
  return createDailyRoutineTask({
    id: dto.id,
    title: dto.title,
    description: dto.description,
    position: dto.position,
  });
}
