import { GymExerciseRepository } from '../repositories/GymExerciseRepository';
import { GymProgressRepository } from '../repositories/GymProgressRepository';
import { GymRoutineRepository } from '../repositories/GymRoutineRepository';
import { GymSelectionRepository } from '../repositories/GymSelectionRepository';

/**
 * Borra una rutina, sus ejercicios y su progreso. Si era la rutina elegida
 * para hoy, limpia la selección.
 */
export class DeleteGymRoutine {
  constructor(
    private readonly routines: GymRoutineRepository,
    private readonly exercises: GymExerciseRepository,
    private readonly progress: GymProgressRepository,
    private readonly selection: GymSelectionRepository,
  ) {}

  async execute(id: string): Promise<void> {
    await this.exercises.deleteAllForRoutine(id);
    await this.progress.deleteAllForRoutine(id);
    await this.routines.delete(id);

    const selectedId = await this.selection.getSelectedRoutineId();
    if (selectedId === id) {
      await this.selection.setSelectedRoutineId(null);
    }
  }
}
