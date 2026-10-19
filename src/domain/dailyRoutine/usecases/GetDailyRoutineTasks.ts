import { DailyRoutineTask } from '../entities/DailyRoutineTask';
import { DailyRoutineTaskRepository } from '../repositories/DailyRoutineTaskRepository';

/** Tareas de rutina diaria, ordenadas por posición (y por título si empatan). */
export class GetDailyRoutineTasks {
  constructor(private readonly repository: DailyRoutineTaskRepository) {}

  async execute(): Promise<DailyRoutineTask[]> {
    const tasks = await this.repository.getAll();
    return tasks.sort((a, b) => a.position - b.position || a.title.localeCompare(b.title, 'es'));
  }
}
