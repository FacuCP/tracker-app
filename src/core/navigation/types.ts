/**
 * Mapa de rutas de la app y sus parámetros. Tiparlo acá le da autocompletado
 * y chequeo a navigation.navigate(...) en todas las pantallas.
 *
 * Favoritos / Trackers / Lists / Finances / Gym son las cinco pantallas "hub" a
 * las que se llega desde el menú del header. La principal (initialRoute) es
 * Favoritos.
 */
export type RootStackParamList = {
  Onboarding: undefined;
  Favorites: undefined;
  Trackers: { create?: boolean } | undefined;
  Lists: { create?: boolean } | undefined;
  ListDetail: { listId: string };
  Finances: { add?: 'income' | 'expense' } | undefined;
  Gym: { create?: boolean } | undefined;
  GymRoutineDetail: { routineId: string };
  Settings: undefined;
  MoodProgress: undefined;
  CreateTracker: undefined;
  EditTracker: { trackerId: string };
  TrackerProgress: { trackerId: string };
};
