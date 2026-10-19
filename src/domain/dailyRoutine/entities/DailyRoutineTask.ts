/**
 * Una tarea de "Rutina diaria": título + descripción opcional (como una
 * entrada de lista), que se va tildando y se resetea sola todos los días
 * (ver `DailyTaskProgress`).
 */
export interface DailyRoutineTask {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  /** Orden en la lista (1, 2, 3...). */
  readonly position: number;
}

export const MAX_TASK_TITLE = 60;
export const MAX_TASK_DESCRIPTION = 300;

export function createDailyRoutineTask(params: {
  id: string;
  title: string;
  description?: string;
  position: number;
}): DailyRoutineTask {
  const title = params.title.trim();
  if (title.length === 0) {
    throw new Error('La tarea necesita un título');
  }
  if (title.length > MAX_TASK_TITLE) {
    throw new Error(`El título no puede superar los ${MAX_TASK_TITLE} caracteres`);
  }
  const description = params.description?.trim() || undefined;
  if (description != null && description.length > MAX_TASK_DESCRIPTION) {
    throw new Error(`La descripción no puede superar los ${MAX_TASK_DESCRIPTION} caracteres`);
  }
  if (!Number.isInteger(params.position) || params.position < 1) {
    throw new Error('La posición tiene que ser un entero mayor o igual a 1');
  }

  return { id: params.id, title, description, position: params.position };
}
