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
import { UpdateUserProfile } from '../../domain/user/usecases/UpdateUserProfile';
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
import { SetTrackerFavorite } from '../../domain/tracker/usecases/SetTrackerFavorite';
import { UpdateTracker } from '../../domain/tracker/usecases/UpdateTracker';
import { TrackersOrderRepositoryImpl } from '../../data/tracker/repositories/TrackersOrderRepositoryImpl';
import { GetTrackersOrder } from '../../domain/tracker/usecases/GetTrackersOrder';
import { SaveTrackersOrder } from '../../domain/tracker/usecases/SaveTrackersOrder';
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
import { SetListEntryDone } from '../../domain/list/usecases/SetListEntryDone';
import { SetListFavorite } from '../../domain/list/usecases/SetListFavorite';
import { SetListPinnedExpanded } from '../../domain/list/usecases/SetListPinnedExpanded';
import { ListsOrderRepositoryImpl } from '../../data/list/repositories/ListsOrderRepositoryImpl';
import { GetListsOrder } from '../../domain/list/usecases/GetListsOrder';
import { SaveListsOrder } from '../../domain/list/usecases/SaveListsOrder';
import { AsyncStorageFinanceCategoryLocalDataSource } from '../../data/finance/datasources/FinanceCategoryLocalDataSource';
import { AsyncStorageFinanceTransactionLocalDataSource } from '../../data/finance/datasources/FinanceTransactionLocalDataSource';
import { FinanceCategoryRepositoryImpl } from '../../data/finance/repositories/FinanceCategoryRepositoryImpl';
import { FinanceTransactionRepositoryImpl } from '../../data/finance/repositories/FinanceTransactionRepositoryImpl';
import { DeleteFinanceCategory } from '../../domain/finance/usecases/DeleteFinanceCategory';
import { DeleteFinanceTransaction } from '../../domain/finance/usecases/DeleteFinanceTransaction';
import { GetCurrentBalance } from '../../domain/finance/usecases/GetCurrentBalance';
import { GetFinanceCategories } from '../../domain/finance/usecases/GetFinanceCategories';
import { GetFinanceReport } from '../../domain/finance/usecases/GetFinanceReport';
import { GetFinanceTransactions } from '../../domain/finance/usecases/GetFinanceTransactions';
import { SaveFinanceCategory } from '../../domain/finance/usecases/SaveFinanceCategory';
import { SaveFinanceTransaction } from '../../domain/finance/usecases/SaveFinanceTransaction';
import { FavoritesOrderRepositoryImpl } from '../../data/favorites/FavoritesOrderRepositoryImpl';
import { GetFavoritesOrder } from '../../domain/favorites/usecases/GetFavoritesOrder';
import { SaveFavoritesOrder } from '../../domain/favorites/usecases/SaveFavoritesOrder';
import { AsyncStorageGymRoutineLocalDataSource } from '../../data/gym/datasources/GymRoutineLocalDataSource';
import { AsyncStorageGymExerciseLocalDataSource } from '../../data/gym/datasources/GymExerciseLocalDataSource';
import { AsyncStorageGymProgressLocalDataSource } from '../../data/gym/datasources/GymProgressLocalDataSource';
import { AsyncStorageGymSelectionLocalDataSource } from '../../data/gym/datasources/GymSelectionLocalDataSource';
import { GymRoutineRepositoryImpl } from '../../data/gym/repositories/GymRoutineRepositoryImpl';
import { GymExerciseRepositoryImpl } from '../../data/gym/repositories/GymExerciseRepositoryImpl';
import { GymProgressRepositoryImpl } from '../../data/gym/repositories/GymProgressRepositoryImpl';
import { GymSelectionRepositoryImpl } from '../../data/gym/repositories/GymSelectionRepositoryImpl';
import { CreateGymRoutine } from '../../domain/gym/usecases/CreateGymRoutine';
import { DeleteGymExercise } from '../../domain/gym/usecases/DeleteGymExercise';
import { DeleteGymRoutine } from '../../domain/gym/usecases/DeleteGymRoutine';
import { GetGymExercises } from '../../domain/gym/usecases/GetGymExercises';
import { GetGymProgress } from '../../domain/gym/usecases/GetGymProgress';
import { GetGymRoutine } from '../../domain/gym/usecases/GetGymRoutine';
import { GetGymRoutines } from '../../domain/gym/usecases/GetGymRoutines';
import { GetGymSelection } from '../../domain/gym/usecases/GetGymSelection';
import { GetGymSession } from '../../domain/gym/usecases/GetGymSession';
import { ReorderGymExercises } from '../../domain/gym/usecases/ReorderGymExercises';
import { ResetGymRoutineProgress } from '../../domain/gym/usecases/ResetGymRoutineProgress';
import { SaveGymExercise } from '../../domain/gym/usecases/SaveGymExercise';
import { SaveGymSelection } from '../../domain/gym/usecases/SaveGymSelection';
import { SetGymSetCount } from '../../domain/gym/usecases/SetGymSetCount';
import { AsyncStorageDailyRoutineTaskLocalDataSource } from '../../data/dailyRoutine/datasources/DailyRoutineTaskLocalDataSource';
import { AsyncStorageDailyTaskProgressLocalDataSource } from '../../data/dailyRoutine/datasources/DailyTaskProgressLocalDataSource';
import { DailyRoutineTaskRepositoryImpl } from '../../data/dailyRoutine/repositories/DailyRoutineTaskRepositoryImpl';
import { DailyTaskProgressRepositoryImpl } from '../../data/dailyRoutine/repositories/DailyTaskProgressRepositoryImpl';
import { DeleteDailyRoutineTask } from '../../domain/dailyRoutine/usecases/DeleteDailyRoutineTask';
import { GetDailyRoutineProgress } from '../../domain/dailyRoutine/usecases/GetDailyRoutineProgress';
import { GetDailyRoutineSession } from '../../domain/dailyRoutine/usecases/GetDailyRoutineSession';
import { GetDailyRoutineTasks } from '../../domain/dailyRoutine/usecases/GetDailyRoutineTasks';
import { ReorderDailyRoutineTasks } from '../../domain/dailyRoutine/usecases/ReorderDailyRoutineTasks';
import { SaveDailyRoutineTask } from '../../domain/dailyRoutine/usecases/SaveDailyRoutineTask';
import { SetDailyTaskDone } from '../../domain/dailyRoutine/usecases/SetDailyTaskDone';
import { SyncRoutineTracker } from '../../domain/dailyRoutine/usecases/SyncRoutineTracker';
import { AsyncStorageEventLocalDataSource } from '../../data/event/datasources/EventLocalDataSource';
import { EventRepositoryImpl } from '../../data/event/repositories/EventRepositoryImpl';
import { DeleteEvent } from '../../domain/event/usecases/DeleteEvent';
import { DeleteEventOccurrence } from '../../domain/event/usecases/DeleteEventOccurrence';
import { GetEventOccurrencesInRange } from '../../domain/event/usecases/GetEventOccurrencesInRange';
import { GetEvents } from '../../domain/event/usecases/GetEvents';
import { SaveEvent } from '../../domain/event/usecases/SaveEvent';

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
const trackersOrderRepository = new TrackersOrderRepositoryImpl();

// --- Listas del usuario ---
const listRepository = new ListRepositoryImpl(new AsyncStorageListLocalDataSource());
const listEntryRepository = new ListEntryRepositoryImpl(new AsyncStorageListEntryLocalDataSource());
const listsOrderRepository = new ListsOrderRepositoryImpl();

// --- Finanzas ---
const financeCategoryRepository = new FinanceCategoryRepositoryImpl(
  new AsyncStorageFinanceCategoryLocalDataSource(),
);
const financeTransactionRepository = new FinanceTransactionRepositoryImpl(
  new AsyncStorageFinanceTransactionLocalDataSource(),
);

// --- Favoritos (orden manual) ---
const favoritesOrderRepository = new FavoritesOrderRepositoryImpl();

// --- Gimnasio ---
const gymRoutineRepository = new GymRoutineRepositoryImpl(new AsyncStorageGymRoutineLocalDataSource());
const gymExerciseRepository = new GymExerciseRepositoryImpl(
  new AsyncStorageGymExerciseLocalDataSource(),
);
const gymProgressRepository = new GymProgressRepositoryImpl(
  new AsyncStorageGymProgressLocalDataSource(),
);
const gymSelectionRepository = new GymSelectionRepositoryImpl(
  new AsyncStorageGymSelectionLocalDataSource(),
);
const getGymExercises = new GetGymExercises(gymExerciseRepository);
const getGymProgress = new GetGymProgress(gymProgressRepository);

// --- Rutina diaria ---
const dailyRoutineTaskRepository = new DailyRoutineTaskRepositoryImpl(
  new AsyncStorageDailyRoutineTaskLocalDataSource(),
);
const dailyTaskProgressRepository = new DailyTaskProgressRepositoryImpl(
  new AsyncStorageDailyTaskProgressLocalDataSource(),
);
const getDailyRoutineTasks = new GetDailyRoutineTasks(dailyRoutineTaskRepository);
const getDailyRoutineProgress = new GetDailyRoutineProgress(dailyTaskProgressRepository);

// --- Eventos ---
const eventRepository = new EventRepositoryImpl(new AsyncStorageEventLocalDataSource());

// --- Backup ---
const backupRepository = new BackupRepositoryImpl();

export const container = {
  getUserProfile: new GetUserProfile(userRepository),
  updateUserProfile: new UpdateUserProfile(userRepository),
  getWelcomeMessage: new GetWelcomeMessage(userRepository),

  getMoodEntry: new GetMoodEntry(moodRepository),
  saveMoodEntry: new SaveMoodEntry(moodRepository),
  deleteMoodEntry: new DeleteMoodEntry(moodRepository),
  getMoodRange: new GetMoodRange(moodRepository),

  getTrackers: new GetTrackers(trackerRepository),
  getTracker: new GetTracker(trackerRepository),
  createTracker: new CreateTracker(trackerRepository, generateId),
  updateTracker: new UpdateTracker(trackerRepository, generateId),
  setTrackerFavorite: new SetTrackerFavorite(trackerRepository),
  deleteTracker: new DeleteTracker(trackerRepository, trackerEntryRepository),
  getTrackerEntry: new GetTrackerEntry(trackerEntryRepository),
  saveTrackerEntry: new SaveTrackerEntry(trackerRepository, trackerEntryRepository),
  deleteTrackerEntry: new DeleteTrackerEntry(trackerEntryRepository),
  getTrackerRange: new GetTrackerRange(trackerEntryRepository),
  getTrackersOrder: new GetTrackersOrder(trackersOrderRepository),
  saveTrackersOrder: new SaveTrackersOrder(trackersOrderRepository),

  getLists: new GetLists(listRepository),
  getList: new GetList(listRepository),
  createList: new CreateList(listRepository, generateId),
  setListFavorite: new SetListFavorite(listRepository),
  setListPinnedExpanded: new SetListPinnedExpanded(listRepository),
  getListsOrder: new GetListsOrder(listsOrderRepository),
  saveListsOrder: new SaveListsOrder(listsOrderRepository),
  deleteList: new DeleteList(listRepository, listEntryRepository),
  getListEntries: new GetListEntries(listEntryRepository),
  saveListEntry: new SaveListEntry(listRepository, listEntryRepository, generateId),
  setListEntryDone: new SetListEntryDone(listEntryRepository),
  deleteListEntry: new DeleteListEntry(listEntryRepository),

  getFinanceCategories: new GetFinanceCategories(financeCategoryRepository),
  saveFinanceCategory: new SaveFinanceCategory(financeCategoryRepository, generateId),
  deleteFinanceCategory: new DeleteFinanceCategory(financeCategoryRepository),
  getFinanceTransactions: new GetFinanceTransactions(financeTransactionRepository),
  saveFinanceTransaction: new SaveFinanceTransaction(financeTransactionRepository, generateId),
  deleteFinanceTransaction: new DeleteFinanceTransaction(financeTransactionRepository),
  getCurrentBalance: new GetCurrentBalance(financeTransactionRepository),
  getFinanceReport: new GetFinanceReport(financeTransactionRepository, financeCategoryRepository),

  getFavoritesOrder: new GetFavoritesOrder(favoritesOrderRepository),
  saveFavoritesOrder: new SaveFavoritesOrder(favoritesOrderRepository),

  getGymRoutines: new GetGymRoutines(gymRoutineRepository),
  getGymRoutine: new GetGymRoutine(gymRoutineRepository),
  createGymRoutine: new CreateGymRoutine(gymRoutineRepository, generateId),
  deleteGymRoutine: new DeleteGymRoutine(
    gymRoutineRepository,
    gymExerciseRepository,
    gymProgressRepository,
    gymSelectionRepository,
  ),
  getGymExercises,
  saveGymExercise: new SaveGymExercise(gymExerciseRepository, generateId),
  reorderGymExercises: new ReorderGymExercises(gymExerciseRepository),
  deleteGymExercise: new DeleteGymExercise(gymExerciseRepository, gymProgressRepository),
  getGymProgress,
  setGymSetCount: new SetGymSetCount(gymExerciseRepository, gymProgressRepository),
  resetGymRoutineProgress: new ResetGymRoutineProgress(gymProgressRepository),
  getGymSession: new GetGymSession(gymRoutineRepository, getGymExercises, getGymProgress),
  getGymSelection: new GetGymSelection(gymSelectionRepository),
  saveGymSelection: new SaveGymSelection(gymSelectionRepository),

  getDailyRoutineTasks,
  saveDailyRoutineTask: new SaveDailyRoutineTask(dailyRoutineTaskRepository, generateId),
  reorderDailyRoutineTasks: new ReorderDailyRoutineTasks(dailyRoutineTaskRepository),
  deleteDailyRoutineTask: new DeleteDailyRoutineTask(dailyRoutineTaskRepository, dailyTaskProgressRepository),
  getDailyRoutineProgress,
  setDailyTaskDone: new SetDailyTaskDone(dailyTaskProgressRepository),
  getDailyRoutineSession: new GetDailyRoutineSession(getDailyRoutineTasks, getDailyRoutineProgress),
  syncRoutineTracker: new SyncRoutineTracker(trackerRepository, trackerEntryRepository),

  getEvents: new GetEvents(eventRepository),
  saveEvent: new SaveEvent(eventRepository, generateId),
  deleteEvent: new DeleteEvent(eventRepository),
  deleteEventOccurrence: new DeleteEventOccurrence(eventRepository),
  getEventOccurrencesInRange: new GetEventOccurrencesInRange(eventRepository),

  exportBackup: new ExportBackup(backupRepository),
  importBackup: new ImportBackup(backupRepository),
};

export type Container = typeof container;
