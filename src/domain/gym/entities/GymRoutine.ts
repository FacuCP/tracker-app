import { IsoDate } from '../../../core/utils/date';

/**
 * Una rutina de gimnasio: solo un nombre. Sus ejercicios (`GymExercise`) son
 * los que llevan las series, repeticiones, peso y orden.
 */
export interface GymRoutine {
  readonly id: string;
  readonly name: string;
  readonly createdAt: IsoDate;
}

export const MAX_ROUTINE_NAME = 40;

export function createGymRoutine(params: { id: string; name: string; createdAt: IsoDate }): GymRoutine {
  const name = params.name.trim();
  if (name.length === 0) {
    throw new Error('La rutina necesita un nombre');
  }
  if (name.length > MAX_ROUTINE_NAME) {
    throw new Error(`El nombre no puede superar los ${MAX_ROUTINE_NAME} caracteres`);
  }
  return { id: params.id, name, createdAt: params.createdAt };
}
