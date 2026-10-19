import { todayIso } from '../../../core/utils/date';
import { DailyTaskProgressRepository } from '../repositories/DailyTaskProgressRepository';

/** Marca/desmarca una tarea de rutina diaria para hoy. */
export class SetDailyTaskDone {
  constructor(private readonly repository: DailyTaskProgressRepository) {}

  async execute(taskId: string, done: boolean): Promise<void> {
    await this.repository.save({ taskId, day: todayIso(), done });
  }
}
