import { IsoDate } from '../../../core/utils/date';

/**
 * Una lista creada por el usuario. Es solo un nombre; el contenido son sus
 * entradas (`ListEntry`). Si `isTodo` es true, es una to-do list: sus entradas
 * se pueden marcar como completadas y el "rating" pasa a llamarse "prioridad".
 */
export interface List {
  readonly id: string;
  readonly name: string;
  readonly createdAt: IsoDate;
  readonly isTodo: boolean;
}

export const MAX_LIST_NAME = 40;

export function createList(params: {
  id: string;
  name: string;
  createdAt: IsoDate;
  isTodo?: boolean;
}): List {
  const name = params.name.trim();
  if (name.length === 0) {
    throw new Error('La lista necesita un nombre');
  }
  if (name.length > MAX_LIST_NAME) {
    throw new Error(`El nombre no puede superar los ${MAX_LIST_NAME} caracteres`);
  }
  return { id: params.id, name, createdAt: params.createdAt, isTodo: params.isTodo ?? false };
}
