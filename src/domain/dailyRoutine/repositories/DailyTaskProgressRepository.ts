import { DailyTaskProgress } from '../entities/DailyTaskProgress';

/** Puerto para el progreso (hecha hoy o no) de las tareas de rutina diaria. */
export interface DailyTaskProgressRepository {
  getAll(): Promise<Record<string, DailyTaskProgress>>;
  save(progress: DailyTaskProgress): Promise<void>;
  deleteForTask(taskId: string): Promise<void>;
}
