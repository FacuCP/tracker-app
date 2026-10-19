import { DailyRoutineTask, createDailyRoutineTask } from '../entities/DailyRoutineTask';
import { DailyRoutineTaskRepository } from '../repositories/DailyRoutineTaskRepository';

export interface SaveDailyRoutineTaskInput {
  /** Si viene, se edita esa tarea; si no, se crea una nueva. */
  id?: string;
  title: string;
  description?: string;
}

/** Crea o actualiza una tarea de rutina diaria. Las nuevas se agregan al final. */
export class SaveDailyRoutineTask {
  constructor(
    private readonly repository: DailyRoutineTaskRepository,
    private readonly generateId: () => string,
  ) {}

  async execute(input: SaveDailyRoutineTaskInput): Promise<DailyRoutineTask> {
    const existing = await this.repository.getAll();

    let position: number;
    if (input.id) {
      position = existing.find((t) => t.id === input.id)?.position ?? existing.length + 1;
    } else {
      position = existing.reduce((max, t) => Math.max(max, t.position), 0) + 1;
    }

    const task = createDailyRoutineTask({
      id: input.id ?? this.generateId(),
      title: input.title,
      description: input.description,
      position,
    });
    await this.repository.save(task);
    return task;
  }
}
