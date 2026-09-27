/** Puerto para la rutina elegida en el cuadro "Seleccionar rutina para hoy". */
export interface GymSelectionRepository {
  getSelectedRoutineId(): Promise<string | null>;
  setSelectedRoutineId(routineId: string | null): Promise<void>;
}
