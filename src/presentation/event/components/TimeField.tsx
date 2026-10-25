import DateTimePicker from '@react-native-community/datetimepicker';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '../../../core/theme';

interface Props {
  /** Horario en formato 24h "HH:MM", o `null` si no tiene. */
  value: string | null;
  onChange: (time: string | null) => void;
  label?: string;
}

const DEFAULT_TIME = '09:00';

function timeToDate(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
}

function dateToTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Campo de horario opcional: muestra la hora (o "Sin horario") y abre el time picker nativo al tocarlo; tiene una cruz para borrarlo. */
export function TimeField({ value, onChange, label = 'Horario' }: Props) {
  const [show, setShow] = useState(false);

  return (
    <>
      <View style={styles.row}>
        <TouchableOpacity style={styles.field} onPress={() => setShow(true)} activeOpacity={0.7}>
          <Text style={styles.label}>{label}</Text>
          <Text style={[styles.value, value == null && styles.valueEmpty]}>{value ?? 'Sin horario'}</Text>
        </TouchableOpacity>
        {value != null ? (
          <TouchableOpacity style={styles.clear} onPress={() => onChange(null)} hitSlop={8}>
            <X size={16} color={theme.colors.textMuted} strokeWidth={2.5} />
          </TouchableOpacity>
        ) : null}
      </View>

      {show ? (
        <DateTimePicker
          value={timeToDate(value ?? DEFAULT_TIME)}
          mode="time"
          onValueChange={(_event, date) => {
            setShow(false);
            if (date) {
              onChange(dateToTime(date));
            }
          }}
          onDismiss={() => setShow(false)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  field: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 2,
  },
  label: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '700',
  },
  value: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: '600',
  },
  valueEmpty: {
    color: theme.colors.textMuted,
    fontWeight: '400',
  },
  clear: {
    padding: 6,
  },
});
