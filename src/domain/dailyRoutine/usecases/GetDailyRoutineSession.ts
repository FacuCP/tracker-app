import { DailyRoutineTask } from '../entities/DailyRoutineTask';
import { GetDailyRoutineProgress } from './GetDailyRoutineProgress';
import { GetDailyRoutineTasks } from './GetDailyRoutineTasks';

export interface DailyRoutineTaskStatus {
  task: DailyRoutineTask;
  done: boolean;
}

export interface DailyRoutineSession {
  tasks: DailyRoutineTaskStatus[];
  doneCount: number;
  total: number;
}

/** Arma las tareas de hoy con su progreso resuelto, y cuántas están hechas. */
export class GetDailyRoutineSession {
  constructor(
    private readonly getTasks: GetDailyRoutineTasks,
    private readonly getProgress: GetDailyRoutineProgress,
  ) {}

  async execute(): Promise<DailyRoutineSession> {
    const [allTasks, doneMap] = await Promise.all([this.getTasks.execute(), this.getProgress.execute()]);

    const tasks = allTasks.map((task) => ({ task, done: doneMap[task.id] ?? false }));
    const doneCount = tasks.filter((t) => t.done).length;

    return { tasks, doneCount, total: allTasks.length };
  }
}
