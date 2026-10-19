import { IsoDate } from '../../../core/utils/date';

/**
 * Si una tarea de rutina diaria está hecha **hoy**. `day` es el día en que se
 * tildó; si no es el día de hoy, se trata como no hecha (ver
 * `resolveTaskDone`) — así se resetea sola todos los días sin ningún job en
 * segundo plano, igual que el progreso semanal del gimnasio.
 */
export interface DailyTaskProgress {
  readonly taskId: string;
  readonly day: IsoDate;
  readonly done: boolean;
}

/** Si una tarea está hecha hoy, o `false` si el progreso guardado es de otro día. */
export function resolveTaskDone(progress: DailyTaskProgress | undefined, today: IsoDate): boolean {
  if (!progress || progress.day !== today) return false;
  return progress.done;
}
