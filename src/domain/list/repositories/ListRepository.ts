import { List } from '../entities/List';

/** Puerto para el CRUD de las listas del usuario. */
export interface ListRepository {
  getAll(): Promise<List[]>;
  getById(id: string): Promise<List | null>;
  save(list: List): Promise<void>;
  delete(id: string): Promise<void>;
}
