import { Tracker } from '../entities/Tracker';

/** Puerto para el CRUD de los trackers que crea el usuario. */
export interface TrackerRepository {
  getAll(): Promise<Tracker[]>;
  getById(id: string): Promise<Tracker | null>;
  save(tracker: Tracker): Promise<void>;
  delete(id: string): Promise<void>;
}
