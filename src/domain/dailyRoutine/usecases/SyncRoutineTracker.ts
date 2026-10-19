import { todayIso } from '../../../core/utils/date';
import { createTracker } from '../../tracker/entities/Tracker';
import { createTrackerEntry } from '../../tracker/entities/TrackerEntry';
import { TrackerEntryRepository } from '../../tracker/repositories/TrackerEntryRepository';
import { TrackerRepository } from '../../tracker/repositories/TrackerRepository';

/**
 * Id y nombre fijos (no generados): así se puede "encontrar" siempre el mismo
 * tracker entre reinicios de la app sin guardar una referencia aparte.
 */
export const ROUTINE_TRACKER_ID = 'daily-routine-tracker';
export const ROUTINE_TRACKER_NAME = 'Seguimiento de Rutina';

export const ROUTINE_TRACKER_OPTIONS = [
  { id: 'green', label: '100%', color: '#22C55E' },
  { id: 'yellow', label: '50-99%', color: '#EAB308' },
  { id: 'orange', label: '25-49%', color: '#F97316' },
  { id: 'red', label: '0-24%', color: '#EF4444' },
] as const;

function bucketOptionId(percent: number): string {
  if (percent >= 100) return 'green';
  if (percent >= 50) return 'yellow';
  if (percent >= 25) return 'orange';
  return 'red';
}

/**
 * "Llena" el tracker "Seguimiento de Rutina" con el color que corresponde al
 * % de tareas de hoy completadas. Lo crea la primera vez que hace falta (con
 * id fijo) y actualiza el registro de hoy cada vez que cambia el progreso del
 * día — en vez de esperar a un "cierre de día" que no existe sin un job en
 * segundo plano, el último cambio del día deja el color correcto puesto.
 *
 * Es la única dependencia cruzada entre features de dominio en la app
 * (`dailyRoutine` → `tracker`): Rutina diaria necesita "ser" un tracker más,
 * no solo parecerse a uno.
 */
export class SyncRoutineTracker {
  constructor(
    private readonly trackers: TrackerRepository,
    private readonly entries: TrackerEntryRepository,
  ) {}

  async execute(doneCount: number, total: number): Promise<void> {
    if (total === 0) return;

    let tracker = await this.trackers.getById(ROUTINE_TRACKER_ID);
    if (!tracker) {
      tracker = createTracker({
        id: ROUTINE_TRACKER_ID,
        name: ROUTINE_TRACKER_NAME,
        options: ROUTINE_TRACKER_OPTIONS,
        createdAt: todayIso(),
        // Favorito por defecto, y useFavorites lo ordena primero por defecto.
        favorite: true,
      });
      await this.trackers.save(tracker);
    }

    const percent = (doneCount / total) * 100;
    const entry = createTrackerEntry(tracker, {
      date: todayIso(),
      optionIds: [bucketOptionId(percent)],
    });
    await this.entries.saveEntry(entry);
  }
}
