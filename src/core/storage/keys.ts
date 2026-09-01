/**
 * Claves de AsyncStorage de toda la app, en un solo lugar. El backup
 * (exportar / importar) recorre estas claves, así que cualquier feature que
 * persista datos nuevos tiene que registrarlos acá.
 */
export const STORAGE_KEYS = {
  moodEntries: '@app-celu/mood-entries/v1',
  trackers: '@app-celu/trackers/v1',
  trackerEntries: '@app-celu/tracker-entries/v1',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export const ALL_STORAGE_KEYS: StorageKey[] = Object.values(STORAGE_KEYS);
