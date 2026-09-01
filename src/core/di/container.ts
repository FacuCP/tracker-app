import { generateId } from '../utils/id';
import { AsyncStorageUserLocalDataSource } from '../../data/user/datasources/UserLocalDataSource';
import { UserRepositoryImpl } from '../../data/user/repositories/UserRepositoryImpl';
import { AsyncStorageMoodLocalDataSource } from '../../data/mood/datasources/MoodLocalDataSource';
import { MoodRepositoryImpl } from '../../data/mood/repositories/MoodRepositoryImpl';
import { AsyncStorageTrackerLocalDataSource } from '../../data/tracker/datasources/TrackerLocalDataSource';
import { AsyncStorageTrackerEntryLocalDataSource } from '../../data/tracker/datasources/TrackerEntryLocalDataSource';
import { TrackerRepositoryImpl } from '../../data/tracker/repositories/TrackerRepositoryImpl';
import { TrackerEntryRepositoryImpl } from '../../data/tracker/repositories/TrackerEntryRepositoryImpl';
import { GetUserProfile } from '../../domain/user/usecases/GetUserProfile';
import { GetWelcomeMessage } from '../../domain/user/usecases/GetWelcomeMessage';
import { SaveUserName } from '../../domain/user/usecases/SaveUserName';
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
import { AsyncStorageListLocalDataSource } from '../../data/list/datasources/ListLocalDataSource';
import { AsyncStorageListEntryLocalDataSource } from '../../data/list/datasources/ListEntryLocalDataSource';
import { ListRepositoryImpl } from '../../data/list/repositories/ListRepositoryImpl';
import { ListEntryRepositoryImpl } from '../../data/list/repositories/ListEntryRepositoryImpl';
import { CreateList } from '../../domain/list/usecases/CreateList';
import { DeleteList } from '../../domain/list/usecases/DeleteList';
import { DeleteListEntry } from '../../domain/list/usecases/DeleteListEntry';
import { GetList } from '../../domain/list/usecases/GetList';
import { GetListEntries } from '../../domain/list/usecases/GetListEntries';
import { GetLists } from '../../domain/list/usecases/GetLists';
import { SaveListEntry } from '../../domain/list/usecases/SaveListEntry';

/**
 * Composición de dependencias (Composition Root). Es el único lugar donde
 * se "arman" las implementaciones concretas. La UI pide casos de uso a este
 * contenedor y no sabe nada de datasources ni repositorios.
 */

// --- Usuario ---
const userRepository = new UserRepositoryImpl(new AsyncStorageUserLocalDataSource());

// --- Mood tracker ---
const moodLocalDataSource = new AsyncStorageMoodLocalDataSource();
const moodRepository = new MoodRepositoryImpl(moodLocalDataSource);

// --- Trackers del usuario ---
const trackerRepository = new TrackerRepositoryImpl(new AsyncStorageTrackerLocalDataSource());
const trackerEntryRepository = new TrackerEntryRepositoryImpl(
  new AsyncStorageTrackerEntryLocalDataSource(),
);

// --- Listas del usuario ---
const listRepository = new ListRepositoryImpl(new AsyncStorageListLocalDataSource());
const listEntryRepository = new ListEntryRepositoryImpl(new AsyncStorageListEntryLocalDataSource());

// --- Backup ---
const backupRepository = new BackupRepositoryImpl();

export const container = {
  getUserProfile: new GetUserProfile(userRepository),
  saveUserName: new SaveUserName(userRepository),
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

  getLists: new GetLists(listRepository),
  getList: new GetList(listRepository),
  createList: new CreateList(listRepository, generateId),
  deleteList: new DeleteList(listRepository, listEntryRepository),
  getListEntries: new GetListEntries(listEntryRepository),
  saveListEntry: new SaveListEntry(listRepository, listEntryRepository, generateId),
  deleteListEntry: new DeleteListEntry(listEntryRepository),

  exportBackup: new ExportBackup(backupRepository),
  importBackup: new ImportBackup(backupRepository),
};

export type Container = typeof container;
