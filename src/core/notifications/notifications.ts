import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { container } from '../di/container';
import { addDays, fromIsoDate, toIsoDate, todayIso } from '../utils/date';

/**
 * Notificaciones locales de la app. Todo son notificaciones **programadas**: se
 * le dice al SO cuándo mostrarlas y se disparan aunque la app esté cerrada.
 *
 * En Expo Go (SDK 53+) el solo hecho de importar `expo-notifications` tira un
 * error, así que se carga de forma **perezosa** y únicamente en un build real
 * (`expo-dev-client` / EAS). En Expo Go nada de esto hace efecto.
 *
 * Como una notificación programada no puede "chequear" nada al dispararse, la
 * lógica condicional (¿hay trackers sin cargar? ¿la tarea sigue pendiente?) se
 * recalcula cada vez que la app pasa a primer o segundo plano
 * (`syncNotifications` en `AppNavigator`), cancelando y re-agendando. Los días
 * futuros se agendan igual como red de seguridad y se re-evalúan al llegar.
 */
export const notificationsAvailable =
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

type NotificationsModule = typeof import('expo-notifications');
let cached: NotificationsModule | null = null;
let triedLoad = false;

function getNotifications(): NotificationsModule | null {
  if (!notificationsAvailable) return null;
  if (!triedLoad) {
    triedLoad = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      cached = require('expo-notifications') as NotificationsModule;
    } catch {
      cached = null;
    }
  }
  return cached;
}

const TRACKER_PREFIX = 'tracker-reminder:';
const DUE_PREFIX = 'due-reminder:';
const DAYS_AHEAD = 14;
const TRACKER_HOUR = 23;
const DUE_HOUR = 9;

let configured = false;

async function configure(N: NotificationsModule): Promise<void> {
  if (configured) return;
  configured = true;

  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android') {
    await N.setNotificationChannelAsync('default', {
      name: 'Recordatorios',
      importance: N.AndroidImportance.DEFAULT,
    });
  }
}

export async function hasNotificationPermission(): Promise<boolean> {
  const N = getNotifications();
  if (!N) return false;
  const { status } = await N.getPermissionsAsync();
  return status === 'granted';
}

/** Pide permiso si hace falta; devuelve si quedó concedido. */
export async function requestNotificationPermission(): Promise<boolean> {
  const N = getNotifications();
  if (!N) return false;
  await configure(N);
  const existing = await N.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  const requested = await N.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return requested.status === 'granted';
}

async function cancelWithPrefix(N: NotificationsModule, prefix: string): Promise<void> {
  const scheduled = await N.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.identifier.startsWith(prefix))
      .map((item) => N.cancelScheduledNotificationAsync(item.identifier)),
  );
}

function atHour(day: Date, hour: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, 0, 0);
}

async function scheduleAt(
  N: NotificationsModule,
  identifier: string,
  date: Date,
  title: string,
  body: string,
): Promise<void> {
  await N.scheduleNotificationAsync({
    identifier,
    content: { title, body },
    trigger: { type: N.SchedulableTriggerInputTypes.DATE, date },
  });
}

async function syncTrackerReminder(N: NotificationsModule, enabled: boolean): Promise<void> {
  await cancelWithPrefix(N, TRACKER_PREFIX);
  if (!enabled) return;

  const today = todayIso();
  const [mood, trackers] = await Promise.all([
    container.getMoodEntry.execute(today),
    container.getTrackers.execute(),
  ]);
  const entriesToday = await Promise.all(
    trackers.map((tracker) => container.getTrackerEntry.execute(tracker.id, today)),
  );
  const allLoggedToday = mood != null && entriesToday.every((entry) => entry != null);

  const now = new Date();
  for (let d = 0; d < DAYS_AHEAD; d += 1) {
    const day = addDays(now, d);
    const fireAt = atHour(day, TRACKER_HOUR);
    if (fireAt.getTime() <= now.getTime()) continue;
    if (d === 0 && allLoggedToday) continue;
    await scheduleAt(
      N,
      `${TRACKER_PREFIX}${toIsoDate(day)}`,
      fireAt,
      'Trackers de hoy',
      'Recordá cargar tus trackers antes de que empiece el día!',
    );
  }
}

async function syncDueReminders(N: NotificationsModule, enabled: boolean): Promise<void> {
  await cancelWithPrefix(N, DUE_PREFIX);
  if (!enabled) return;

  const lists = await container.getLists.execute();
  const todoLists = lists.filter((list) => list.isTodo);
  const now = new Date();

  for (const list of todoLists) {
    const entries = await container.getListEntries.execute(list.id);
    for (const entry of entries) {
      if (entry.done || entry.date == null) continue;
      const fireAt = atHour(addDays(fromIsoDate(entry.date), -1), DUE_HOUR);
      if (fireAt.getTime() <= now.getTime()) continue;
      await scheduleAt(
        N,
        `${DUE_PREFIX}${entry.id}`,
        fireAt,
        'Tarea por vencer',
        `Recuerda que ${entry.name} se vence mañana!`,
      );
    }
  }
}

/** Re-agenda todas las notificaciones locales según el perfil y los datos actuales. */
export async function syncNotifications(): Promise<void> {
  const N = getNotifications();
  if (!N) return;
  try {
    await configure(N);
    const profile = await container.getUserProfile.execute();
    const wantsTrackers = profile?.notifyTrackers ?? false;
    const wantsDue = profile?.notifyDueTasks ?? false;

    if (!wantsTrackers && !wantsDue) {
      await cancelWithPrefix(N, TRACKER_PREFIX);
      await cancelWithPrefix(N, DUE_PREFIX);
      return;
    }

    const { status } = await N.getPermissionsAsync();
    const granted = status === 'granted';
    await syncTrackerReminder(N, granted && wantsTrackers);
    await syncDueReminders(N, granted && wantsDue);
  } catch {
    // Se reintenta en el próximo sync.
  }
}
