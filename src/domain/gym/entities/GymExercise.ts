/**
 * Un ejercicio de una rutina: nombre, series y repeticiones objetivo (o
 * segundos, si es "por tiempo"; o "al fallo", sin número fijo — mutuamente
 * excluyentes), un peso en kg y el puesto (orden) en el que se muestra dentro
 * de la rutina.
 */
export interface GymExercise {
  readonly id: string;
  readonly routineId: string;
  readonly name: string;
  /** Cantidad de series objetivo (>= 1). */
  readonly sets: number;
  /** Repeticiones (o segundos, si `isTimed`) por serie (>= 1), o `null` si es "al fallo". */
  readonly reps: number | null;
  /** Si es `true`, `reps` se interpreta y se muestra como segundos ("por tiempo"). */
  readonly isTimed: boolean;
  /** Peso en kg (0 = sin peso). */
  readonly weightKg: number;
  /** Orden dentro de la rutina (1, 2, 3...). */
  readonly position: number;
  /** Notas opcionales (técnica, video, etc.); puede incluir un link. */
  readonly description?: string;
}

export const MAX_EXERCISE_NAME = 60;
export const MIN_SETS = 1;
export const MAX_SETS = 50;
export const MIN_REPS = 1;
export const MAX_REPS = 200;
export const DEFAULT_SETS = 4;
export const DEFAULT_REPS = 12;
export const MAX_DESCRIPTION = 500;

/** Pasos de peso disponibles para los botones +/- del editor. */
export const WEIGHT_STEPS_KG: readonly number[] = [1, 2.5, 5];

export function createGymExercise(params: {
  id: string;
  routineId: string;
  name: string;
  sets: number;
  reps: number | null;
  isTimed: boolean;
  weightKg: number;
  position: number;
  description?: string;
}): GymExercise {
  const name = params.name.trim();
  if (name.length === 0) {
    throw new Error('El ejercicio necesita un nombre');
  }
  if (name.length > MAX_EXERCISE_NAME) {
    throw new Error(`El nombre no puede superar los ${MAX_EXERCISE_NAME} caracteres`);
  }
  const description = params.description?.trim() || undefined;
  if (description != null && description.length > MAX_DESCRIPTION) {
    throw new Error(`La descripción no puede superar los ${MAX_DESCRIPTION} caracteres`);
  }
  if (!Number.isInteger(params.sets) || params.sets < MIN_SETS || params.sets > MAX_SETS) {
    throw new Error(`Las series tienen que ser un entero entre ${MIN_SETS} y ${MAX_SETS}`);
  }
  if (
    params.reps != null &&
    (!Number.isInteger(params.reps) || params.reps < MIN_REPS || params.reps > MAX_REPS)
  ) {
    throw new Error(`Las repeticiones tienen que ser un entero entre ${MIN_REPS} y ${MAX_REPS}`);
  }
  if (params.isTimed && params.reps == null) {
    throw new Error('Un ejercicio "por tiempo" necesita un tiempo (no puede ser "al fallo")');
  }
  if (!Number.isFinite(params.weightKg) || params.weightKg < 0) {
    throw new Error('El peso tiene que ser un número mayor o igual a 0');
  }
  if (!Number.isInteger(params.position) || params.position < 1) {
    throw new Error('El puesto tiene que ser un entero mayor o igual a 1');
  }

  return {
    id: params.id,
    routineId: params.routineId,
    name,
    sets: params.sets,
    reps: params.reps,
    isTimed: params.isTimed,
    weightKg: Math.round(params.weightKg * 100) / 100,
    position: params.position,
    description,
  };
}

/** Nuevo peso al tocar un botón +/- de paso `delta` kg, sin bajar de 0. */
export function adjustWeightKg(current: number, delta: number): number {
  return Math.max(0, Math.round((current + delta) * 100) / 100);
}
