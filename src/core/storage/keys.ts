/**
 * Claves de AsyncStorage de toda la app, en un solo lugar. El backup
 * (exportar / importar) recorre estas claves, así que cualquier feature que
 * persista datos nuevos tiene que registrarlos acá.
 */
export const STORAGE_KEYS = {
  userProfile: '@app-celu/user-profile/v1',
  moodEntries: '@app-celu/mood-entries/v1',
  trackers: '@app-celu/trackers/v1',
  trackerEntries: '@app-celu/tracker-entries/v1',
  lists: '@app-celu/lists/v1',
  listEntries: '@app-celu/list-entries/v1',
  financeCategories: '@app-celu/finance-categories/v1',
  financeTransactions: '@app-celu/finance-transactions/v1',
  favoritesOrder: '@app-celu/favorites-order/v1',
  gymRoutines: '@app-celu/gym-routines/v1',
  gymExercises: '@app-celu/gym-exercises/v1',
  gymProgress: '@app-celu/gym-progress/v1',
  gymSelection: '@app-celu/gym-selection/v1',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export const ALL_STORAGE_KEYS: StorageKey[] = Object.values(STORAGE_KEYS);
