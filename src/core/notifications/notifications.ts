import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { container } from '../di/container';
import { addDays, fromIsoDate, toIsoDate, todayIso } from '../utils/date';

/**
 * Notificaciones locales de la app. Todo son notificaciones **programadas**: se
 * le dice al SO cuándo mostrarlas y se disparan aunque la app esté cerrada.
 *
 * Como una notificación programada no puede "chequear" nada al dispararse, la
 * lógica condicional (¿hay trackers sin cargar? ¿la tarea sigue pendiente?) se
 * recalcula cada vez que la app pasa a primer o segundo plano (`syncNotifications`
 * en `AppNavigator`), cancelando y re-agendando. Los días futuros se agendan
 * igual como red de seguridad y se re-evalúan cuando llega ese día.
 */
const TRACKER_PREFIX = 'tracker-reminder:';
const DUE_PREFIX = 'due-reminder:';
const DAYS_AHEAD = 14;
const TRACKER_HOUR = 23;
const DUE_HOUR = 9;

let configured = false;

export async function configureNotifications(): Promise<void> {
  if (configured) return;
  configured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Recordatorios',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function hasNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/** Pide permiso si hace falta; devuelve si quedó concedido. */
export async function requestNotificationPermission(): Promise<boolean> {
  await configureNotifications();
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return requested.status === 'granted';
}

async function cancelWithPrefix(prefix: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(prefix))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

function atHour(day: Date, hour: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, 0, 0);
}

async function scheduleAt(
  identifier: string,
  date: Date,
  title: string,
  body: string,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
}

async function syncTrackerReminder(enabled: boolean): Promise<void> {
  await cancelWithPrefix(TRACKER_PREFIX);
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
      `${TRACKER_PREFIX}${toIsoDate(day)}`,
      fireAt,
      'Trackers de hoy',
      'Recordá cargar tus trackers antes de que empiece el día!',
    );
  }
}

async function syncDueReminders(enabled: boolean): Promise<void> {
  await cancelWithPrefix(DUE_PREFIX);
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
  try {
    await configureNotifications();
    const profile = await container.getUserProfile.execute();
    const wantsTrackers = profile?.notifyTrackers ?? false;
    const wantsDue = profile?.notifyDueTasks ?? false;

    if (!wantsTrackers && !wantsDue) {
      await cancelWithPrefix(TRACKER_PREFIX);
      await cancelWithPrefix(DUE_PREFIX);
      return;
    }

    const granted = await hasNotificationPermission();
    await syncTrackerReminder(granted && wantsTrackers);
    await syncDueReminders(granted && wantsDue);
  } catch {
    // Si el módulo de notificaciones no está disponible (p. ej. Expo Go), se
    // reintenta en el próximo sync.
  }
}
