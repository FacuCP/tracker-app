import { GymRoutine } from '../entities/GymRoutine';

/** Puerto para el CRUD de las rutinas de gimnasio. */
export interface GymRoutineRepository {
  getAll(): Promise<GymRoutine[]>;
  getById(id: string): Promise<GymRoutine | null>;
  save(routine: GymRoutine): Promise<void>;
  delete(id: string): Promise<void>;
}
