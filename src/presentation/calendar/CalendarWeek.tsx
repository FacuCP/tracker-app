import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

import { addDays, startOfWeek, toIsoDate, todayIso } from '../../core/utils/date';
import { DayRenderer } from './types';

interface Props {
  anchor: Date;
  renderDay: DayRenderer;
}

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const GAP = 8;

/** Layout de una semana (lunes a domingo). No sabe qué se pinta en cada día. */
export function CalendarWeek({ anchor, renderDay }: Props) {
  const [width, setWidth] = useState(0);
  const start = startOfWeek(anchor);
  const today = todayIso();
  const cellSize = width > 0 ? Math.floor((width - GAP * 6) / 7) : 0;

  function onLayout(e: LayoutChangeEvent) {
    setWidth(e.nativeEvent.layout.width);
  }

  return (
    <View onLayout={onLayout}>
      <View style={styles.row}>
        {WEEKDAY_LABELS.map((label, i) => (
          <Text key={i} style={[styles.label, { width: cellSize || undefined }]}>
            {label}
          </Text>
        ))}
      </View>

      {cellSize > 0 ? (
        <View style={styles.row}>
          {Array.from({ length: 7 }, (_, i) => {
            const dayDate = addDays(start, i);
            const date = toIsoDate(dayDate);
            return (
              <View key={date}>
                {renderDay({
                  date,
                  dayOfMonth: dayDate.getDate(),
                  isToday: date === today,
                  size: cellSize,
                })}
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: GAP,
  },
  label: {
    textAlign: 'center',
    fontWeight: '700',
    color: '#6b7280',
    fontSize: 12,
  },
});
