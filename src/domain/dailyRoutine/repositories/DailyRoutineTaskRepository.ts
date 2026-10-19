import { DailyRoutineTask } from '../entities/DailyRoutineTask';

/** Puerto para las tareas de "Rutina diaria". */
export interface DailyRoutineTaskRepository {
  getAll(): Promise<DailyRoutineTask[]>;
  save(task: DailyRoutineTask): Promise<void>;
  /** Guarda varias tareas en una sola escritura (p. ej. al reordenar). */
  saveMany(tasks: DailyRoutineTask[]): Promise<void>;
  delete(id: string): Promise<void>;
}
