/**
 * Mapa de rutas de la app y sus parámetros. Tiparlo acá le da autocompletado
 * y chequeo a navigation.navigate(...) en todas las pantallas.
 *
 * Trackers / Lists / Finances son las tres pantallas "hub" a las que se llega
 * desde el menú del header. La principal (initialRoute) es Trackers.
 */
export type RootStackParamList = {
  Onboarding: undefined;
  Trackers: undefined;
  Lists: undefined;
  ListDetail: { listId: string };
  Finances: undefined;
  Settings: undefined;
  MoodProgress: undefined;
  CreateTracker: undefined;
  EditTracker: { trackerId: string };
  TrackerProgress: { trackerId: string };
};
