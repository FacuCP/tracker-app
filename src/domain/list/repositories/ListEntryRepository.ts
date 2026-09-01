import { ListEntry } from '../entities/ListEntry';

/** Puerto para las entradas de las listas del usuario. */
export interface ListEntryRepository {
  getForList(listId: string): Promise<ListEntry[]>;
  saveEntry(entry: ListEntry): Promise<void>;
  deleteEntry(listId: string, entryId: string): Promise<void>;
  /** Borra todas las entradas de una lista (al eliminar la lista). */
  deleteAllForList(listId: string): Promise<void>;
}
