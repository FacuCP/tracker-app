import { IsoDate } from '../../../core/utils/date';
import { TrackerEntry } from '../entities/TrackerEntry';

/** Puerto para los registros diarios de los trackers del usuario. */
export interface TrackerEntryRepository {
  getEntry(trackerId: string, date: IsoDate): Promise<TrackerEntry | null>;
  getEntriesInRange(trackerId: string, start: IsoDate, end: IsoDate): Promise<TrackerEntry[]>;
  saveEntry(entry: TrackerEntry): Promise<void>;
  deleteEntry(trackerId: string, date: IsoDate): Promise<void>;
  /** Borra todos los registros de un tracker (al eliminar el tracker). */
  deleteAllForTracker(trackerId: string): Promise<void>;
}
