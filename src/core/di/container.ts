import { generateId } from '../utils/id';
import { InMemoryUserLocalDataSource } from '../../data/datasources/UserLocalDataSource';
import { UserRepositoryImpl } from '../../data/repositories/UserRepositoryImpl';
import { AsyncStorageMoodLocalDataSource } from '../../data/mood/datasources/MoodLocalDataSource';
import { MoodRepositoryImpl } from '../../data/mood/repositories/MoodRepositoryImpl';
import { AsyncStorageTrackerLocalDataSource } from '../../data/tracker/datasources/TrackerLocalDataSource';
import { AsyncStorageTrackerEntryLocalDataSource } from '../../data/tracker/datasources/TrackerEntryLocalDataSource';
import { TrackerRepositoryImpl } from '../../data/tracker/repositories/TrackerRepositoryImpl';
import { TrackerEntryRepositoryImpl } from '../../data/tracker/repositories/TrackerEntryRepositoryImpl';
import { GetWelcomeMessage } from '../../domain/usecases/GetWelcomeMessage';
import { DeleteMoodEntry } from '../../domain/mood/usecases/DeleteMoodEntry';
import { GetMoodEntry } from '../../domain/mood/usecases/GetMoodEntry';
import { GetMoodRange } from '../../domain/mood/usecases/GetMoodRange';
import { SaveMoodEntry } from '../../domain/mood/usecases/SaveMoodEntry';
import { BackupRepositoryImpl } from '../../data/backup/BackupRepositoryImpl';
import { ExportBackup } from '../../domain/backup/usecases/ExportBackup';
import { ImportBackup } from '../../domain/backup/usecases/ImportBackup';
import { CreateTracker } from '../../domain/tracker/usecases/CreateTracker';
import { DeleteTracker } from '../../domain/tracker/usecases/DeleteTracker';
import { DeleteTrackerEntry } from '../../domain/tracker/usecases/DeleteTrackerEntry';
import { GetTracker } from '../../domain/tracker/usecases/GetTracker';
import { GetTrackerEntry } from '../../domain/tracker/usecases/GetTrackerEntry';
import { GetTrackerRange } from '../../domain/tracker/usecases/GetTrackerRange';
import { GetTrackers } from '../../domain/tracker/usecases/GetTrackers';
import { SaveTrackerEntry } from '../../domain/tracker/usecases/SaveTrackerEntry';
import { UpdateTracker } from '../../domain/tracker/usecases/UpdateTracker';

/**
 * Composición de dependencias (Composition Root). Es el único lugar donde
 * se "arman" las implementaciones concretas. La UI pide casos de uso a este
 * contenedor y no sabe nada de datasources ni repositorios.
 */

// --- Usuario ---
const userLocalDataSource = new InMemoryUserLocalDataSource();
const userRepository = new UserRepositoryImpl(userLocalDataSource);

// --- Mood tracker ---
const moodLocalDataSource = new AsyncStorageMoodLocalDataSource();
const moodRepository = new MoodRepositoryImpl(moodLocalDataSource);

// --- Trackers del usuario ---
const trackerRepository = new TrackerRepositoryImpl(new AsyncStorageTrackerLocalDataSource());
const trackerEntryRepository = new TrackerEntryRepositoryImpl(
  new AsyncStorageTrackerEntryLocalDataSource(),
);

// --- Backup ---
const backupRepository = new BackupRepositoryImpl();

export const container = {
  getWelcomeMessage: new GetWelcomeMessage(userRepository),

  getMoodEntry: new GetMoodEntry(moodRepository),
  saveMoodEntry: new SaveMoodEntry(moodRepository),
  deleteMoodEntry: new DeleteMoodEntry(moodRepository),
  getMoodRange: new GetMoodRange(moodRepository),

  getTrackers: new GetTrackers(trackerRepository),
  getTracker: new GetTracker(trackerRepository),
  createTracker: new CreateTracker(trackerRepository, generateId),
  updateTracker: new UpdateTracker(trackerRepository, generateId),
  deleteTracker: new DeleteTracker(trackerRepository, trackerEntryRepository),
  getTrackerEntry: new GetTrackerEntry(trackerEntryRepository),
  saveTrackerEntry: new SaveTrackerEntry(trackerRepository, trackerEntryRepository),
  deleteTrackerEntry: new DeleteTrackerEntry(trackerEntryRepository),
  getTrackerRange: new GetTrackerRange(trackerEntryRepository),

  exportBackup: new ExportBackup(backupRepository),
  importBackup: new ImportBackup(backupRepository),
};

export type Container = typeof container;
