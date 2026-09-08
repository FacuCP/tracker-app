import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { capitalize, IsoDate, MONTHS_SHORT_ES, toIsoDate } from '../../core/utils/date';
import { DiagonalSplitSquare } from '../components/DiagonalSplitSquare';

interface Props {
  year: number;
  /** Uno o dos colores hex con los que se marca un día, o undefined si no hay registro. */
  dayColors: (date: IsoDate) => string[] | undefined;
  onSelectMonth: (year: number, month: number) => void;
}

const COLUMNS = 3;
const OUTER_GAP = 12;
const DOT_GAP = 2;
const EMPTY_DOT = '#e5e7eb';

/**
 * Layout anual: doce mini-calendarios. Cada día es un puntito del color que
 * devuelva `dayColor`. Tocar un mes lo abre en la vista mensual.
 */
export function CalendarYear({ year, dayColors, onSelectMonth }: Props) {
  const [width, setWidth] = useState(0);
  const miniWidth = width > 0 ? (width - OUTER_GAP * (COLUMNS - 1)) / COLUMNS : 0;
  const dotSize = miniWidth > 0 ? Math.floor((miniWidth - DOT_GAP * 6) / 7) : 0;

  function onLayout(e: LayoutChangeEvent) {
    setWidth(e.nativeEvent.layout.width);
  }

  return (
    <View style={styles.grid} onLayout={onLayout}>
      {dotSize > 0
        ? Array.from({ length: 12 }, (_, month) => (
            <TouchableOpacity
              key={month}
              style={[styles.mini, { width: miniWidth }]}
              activeOpacity={0.7}
              onPress={() => onSelectMonth(year, month)}
            >
              <Text style={styles.miniTitle}>{capitalize(MONTHS_SHORT_ES[month])}</Text>
              <MiniMonth year={year} month={month} dayColors={dayColors} dotSize={dotSize} />
            </TouchableOpacity>
          ))
        : null}
    </View>
  );
}

function MiniMonth({
  year,
  month,
  dayColors,
  dotSize,
}: {
  year: number;
  month: number;
  dayColors: (date: IsoDate) => string[] | undefined;
  dotSize: number;
}) {
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <View style={styles.dotGrid}>
      {cells.map((day, index) => {
        if (day == null) {
          return <View key={index} style={{ width: dotSize, height: dotSize }} />;
        }
        const colors = dayColors(toIsoDate(new Date(year, month, day))) ?? [];
        if (colors.length >= 2) {
          return (
            <DiagonalSplitSquare key={index} colors={colors.slice(0, 2)} size={dotSize} borderRadius={1} />
          );
        }
        return (
          <View
            key={index}
            style={{
              width: dotSize,
              height: dotSize,
              borderRadius: 2,
              backgroundColor: colors[0] ?? EMPTY_DOT,
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: OUTER_GAP,
  },
  mini: {
    gap: 4,
  },
  miniTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },
  dotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DOT_GAP,
  },
});
