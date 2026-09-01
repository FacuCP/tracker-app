import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

import { toIsoDate, todayIso } from '../../core/utils/date';
import { DayRenderer } from './types';

interface Props {
  year: number;
  month: number; // 0-11
  renderDay: DayRenderer;
}

const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const GAP = 6;

/** Layout de un mes en grilla, empezando en lunes. */
export function CalendarMonth({ year, month, renderDay }: Props) {
  const [width, setWidth] = useState(0);

  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayIso();

  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const cellSize = width > 0 ? Math.floor((width - GAP * 6) / 7) : 0;

  function onLayout(e: LayoutChangeEvent) {
    setWidth(e.nativeEvent.layout.width);
  }

  return (
    <View onLayout={onLayout}>
      <View style={styles.weekHeader}>
        {WEEKDAY_LABELS.map((label, i) => (
          <Text key={i} style={[styles.weekLabel, { width: cellSize || undefined }]}>
            {label}
          </Text>
        ))}
      </View>

      {cellSize > 0 ? (
        <View style={styles.grid}>
          {cells.map((day, index) => {
            if (day == null) {
              return <View key={index} style={{ width: cellSize, height: cellSize }} />;
            }
            const date = toIsoDate(new Date(year, month, day));
            return (
              <View key={index}>
                {renderDay({ date, dayOfMonth: day, isToday: date === today, size: cellSize })}
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: GAP,
  },
  weekLabel: {
    textAlign: 'center',
    fontWeight: '700',
    color: '#6b7280',
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
});
