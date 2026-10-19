import { DailyRoutineTaskRepository } from '../repositories/DailyRoutineTaskRepository';
import { DailyTaskProgressRepository } from '../repositories/DailyTaskProgressRepository';

/** Borra una tarea de rutina diaria y su progreso. */
export class DeleteDailyRoutineTask {
  constructor(
    private readonly tasks: DailyRoutineTaskRepository,
    private readonly progress: DailyTaskProgressRepository,
  ) {}

  async execute(id: string): Promise<void> {
    await this.tasks.delete(id);
    await this.progress.deleteForTask(id);
  }
}
