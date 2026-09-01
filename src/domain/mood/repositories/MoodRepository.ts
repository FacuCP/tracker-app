import { IsoDate } from '../../../core/utils/date';
import { MoodEntry } from '../entities/MoodEntry';

/**
 * Puerto del dominio para persistir registros de ánimo. La implementación
 * concreta (AsyncStorage, SQLite, API...) vive en la capa de datos.
 */
export interface MoodRepository {
  getEntry(date: IsoDate): Promise<MoodEntry | null>;

  /** Registros con fecha entre `start` y `end`, ambos inclusive. */
  getEntriesInRange(start: IsoDate, end: IsoDate): Promise<MoodEntry[]>;

  saveEntry(entry: MoodEntry): Promise<void>;

  deleteEntry(date: IsoDate): Promise<void>;
}
