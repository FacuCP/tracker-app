import { todayIso } from '../../../core/utils/date';
import { resolveTaskDone } from '../entities/DailyTaskProgress';
import { DailyTaskProgressRepository } from '../repositories/DailyTaskProgressRepository';

/** Qué tareas están hechas hoy (`Record<taskId, true>`, resuelto para el día actual). */
export class GetDailyRoutineProgress {
  constructor(private readonly repository: DailyTaskProgressRepository) {}

  async execute(): Promise<Record<string, boolean>> {
    const all = await this.repository.getAll();
    const today = todayIso();

    const result: Record<string, boolean> = {};
    for (const taskId of Object.keys(all)) {
      if (resolveTaskDone(all[taskId], today)) {
        result[taskId] = true;
      }
    }
    return result;
  }
}
