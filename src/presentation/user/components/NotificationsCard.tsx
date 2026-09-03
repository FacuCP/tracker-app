import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';

import { container } from '../../../core/di/container';
import {
  requestNotificationPermission,
  syncNotifications,
} from '../../../core/notifications/notifications';
import { theme } from '../../../core/theme';

/** Card de Ajustes: activar/desactivar las dos notificaciones. */
export function NotificationsCard() {
  const [notifyTrackers, setNotifyTrackers] = useState(false);
  const [notifyDueTasks, setNotifyDueTasks] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    container.getUserProfile.execute().then((profile) => {
      setNotifyTrackers(profile?.notifyTrackers ?? false);
      setNotifyDueTasks(profile?.notifyDueTasks ?? false);
      setLoaded(true);
    });
  }, []);

  async function toggle(which: 'trackers' | 'due', value: boolean) {
    setNote(null);
    setBusy(true);
    try {
      if (value && !(await requestNotificationPermission())) {
        setNote('Permití las notificaciones para la app desde los ajustes del teléfono.');
        return;
      }
      if (which === 'trackers') {
        setNotifyTrackers(value);
        await container.updateUserProfile.execute({ notifyTrackers: value });
      } else {
        setNotifyDueTasks(value);
        await container.updateUserProfile.execute({ notifyDueTasks: value });
      }
      await syncNotifications();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Notificaciones</Text>

      {loaded ? (
        <>
          <Row
            label="Recordar cargar trackers"
            hint="Todos los días a las 23:00, si quedan trackers sin cargar."
            value={notifyTrackers}
            disabled={busy}
            onChange={(v) => toggle('trackers', v)}
          />
          <Row
            label="Avisar tareas por vencer"
            hint="El día antes de que venza una tarea de una to-do list."
            value={notifyDueTasks}
            disabled={busy}
            onChange={(v) => toggle('due', v)}
          />
          {note ? <Text style={styles.note}>{note}</Text> : null}
        </>
      ) : (
        <ActivityIndicator />
      )}
    </View>
  );
}

function Row({
  label,
  hint,
  value,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowTexts}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} disabled={disabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowTexts: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  rowHint: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  note: {
    fontSize: 12,
    color: '#b45309',
  },
});
