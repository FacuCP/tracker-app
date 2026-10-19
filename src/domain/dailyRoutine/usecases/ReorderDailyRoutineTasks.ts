import { DailyRoutineTask } from '../entities/DailyRoutineTask';
import { DailyRoutineTaskRepository } from '../repositories/DailyRoutineTaskRepository';

/** Reordena las tareas de rutina diaria según el orden de ids recibido. */
export class ReorderDailyRoutineTasks {
  constructor(private readonly repository: DailyRoutineTaskRepository) {}

  async execute(orderedTaskIds: string[]): Promise<void> {
    const current = await this.repository.getAll();
    const byId = new Map(current.map((t) => [t.id, t]));

    const reordered: DailyRoutineTask[] = [];
    orderedTaskIds.forEach((id, index) => {
      const task = byId.get(id);
      if (task) {
        reordered.push({ ...task, position: index + 1 });
      }
    });

    await this.repository.saveMany(reordered);
  }
}
