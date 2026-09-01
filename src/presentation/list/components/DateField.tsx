import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { capitalize, formatLongDate, fromIsoDate, IsoDate, toIsoDate } from '../../../core/utils/date';
import { theme } from '../../../core/theme';

interface Props {
  value: IsoDate;
  onChange: (date: IsoDate) => void;
}

/** Campo de fecha: muestra la fecha y abre el date picker nativo al tocarlo. */
export function DateField({ value, onChange }: Props) {
  const [show, setShow] = useState(false);

  return (
    <>
      <TouchableOpacity style={styles.field} onPress={() => setShow(true)} activeOpacity={0.7}>
        <Text style={styles.label}>Fecha</Text>
        <Text style={styles.value}>{capitalize(formatLongDate(value))}</Text>
      </TouchableOpacity>

      {show ? (
        <DateTimePicker
          value={fromIsoDate(value)}
          mode="date"
          onValueChange={(_event, date) => {
            setShow(false);
            if (date) {
              onChange(toIsoDate(date));
            }
          }}
          onDismiss={() => setShow(false)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
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
});
