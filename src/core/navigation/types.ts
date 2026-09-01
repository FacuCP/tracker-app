/**
 * Mapa de rutas de la app y sus parámetros. Tiparlo acá le da autocompletado
 * y chequeo a navigation.navigate(...) en todas las pantallas.
 */
export type RootStackParamList = {
  Home: undefined;
  Settings: undefined;
  MoodProgress: undefined;
  CreateTracker: undefined;
  EditTracker: { trackerId: string };
  TrackerProgress: { trackerId: string };
};
