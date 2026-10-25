import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

import { addDays, toIsoDate, todayIso } from '../../core/utils/date';
import { DayRenderer } from './types';

interface Props {
  year: number;
  month: number; // 0-11
  renderDay: DayRenderer;
  /** Si viene en true, completa las semanas con días del mes anterior/siguiente (marcados `isOutsideMonth`) en vez de dejarlos en blanco. */
  showOverflowDays?: boolean;
  /**
   * Si viene en true, además de repartir el ancho en 7 columnas, la celda se
   * achica o agranda para que toda la grilla entre en el alto disponible sin
   * scroll. Requiere que el componente viva en un contenedor de alto fijo
   * (p. ej. `flex: 1` dentro de un alto ya determinado, no un `ScrollView`
   * cuyo alto depende de su contenido).
   */
  fitHeight?: boolean;
  /**
   * Relación alto/ancho "natural" de cada celda cuando no hace falta
   * estirarla (celda más alta que ancha = > 1). Por defecto 1 (cuadrada).
   * Con `fitHeight`, el alto real estira para ocupar todo el disponible —
   * este valor solo se usa si por algún motivo no se pudo medir ese alto.
   */
  cellAspectRatio?: number;
  /** Espacio entre celdas, en px. Por defecto 6. */
  gap?: number;
}

interface Cell {
  date: Date;
  isOutsideMonth: boolean;
}

const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DEFAULT_GAP = 6;

/** Layout de un mes en grilla, empezando en lunes. */
export function CalendarMonth({
  year,
  month,
  renderDay,
  showOverflowDays = false,
  fitHeight = false,
  cellAspectRatio = 1,
  gap: GAP = DEFAULT_GAP,
}: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [headerHeight, setHeaderHeight] = useState(0);

  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayIso();

  const monthDays: Cell[] = Array.from({ length: daysInMonth }, (_, i) => ({
    date: new Date(year, month, i + 1),
    isOutsideMonth: false,
  }));

  let cells: (Cell | null)[];
  if (showOverflowDays) {
    const firstOfMonth = new Date(year, month, 1);
    const leading: Cell[] = Array.from({ length: firstWeekday }, (_, i) => ({
      date: addDays(firstOfMonth, i - firstWeekday),
      isOutsideMonth: true,
    }));
    const withLeading = [...leading, ...monthDays];
    const trailingCount = (7 - (withLeading.length % 7)) % 7;
    const lastOfMonth = new Date(year, month, daysInMonth);
    const trailing: Cell[] = Array.from({ length: trailingCount }, (_, i) => ({
      date: addDays(lastOfMonth, i + 1),
      isOutsideMonth: true,
    }));
    cells = [...withLeading, ...trailing];
  } else {
    cells = [...Array<null>(firstWeekday).fill(null), ...monthDays];
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
  }

  const { width, height } = size;
  // El ancho de la celda siempre sale de repartir el ancho disponible en 7
  // columnas — nunca se achica por falta de alto, para que las celdas queden
  // siempre pegadas unas a otras sin espacio libre a los costados.
  const cellWidth = width > 0 ? Math.floor((width - GAP * 6) / 7) : 0;

  // El alto, en cambio, estira para ocupar siempre todo el disponible — por
  // eso varía de un mes a otro según cuántas filas tenga (4 a 6).
  let cellHeight = cellWidth * cellAspectRatio;
  if (fitHeight && height > 0 && headerHeight > 0) {
    const rows = cells.length / 7;
    // `headerHeight` no incluye su propio `marginBottom` (no es parte de su layout box).
    const gridHeight = height - headerHeight - GAP;
    cellHeight = (gridHeight - GAP * (rows - 1)) / rows;
  }
  cellHeight = Math.max(0, Math.floor(cellHeight));

  function onLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  }

  function onHeaderLayout(e: LayoutChangeEvent) {
    setHeaderHeight(e.nativeEvent.layout.height);
  }

  return (
    <View onLayout={onLayout} style={fitHeight ? styles.fillHeight : undefined}>
      <View style={[styles.weekHeader, { marginBottom: GAP }]} onLayout={onHeaderLayout}>
        {WEEKDAY_LABELS.map((label, i) => (
          <Text key={i} style={[styles.weekLabel, { width: cellWidth || undefined }]}>
            {label}
          </Text>
        ))}
      </View>

      {cellWidth > 0 ? (
        <View style={[styles.grid, { gap: GAP }]}>
          {cells.map((cell, index) => {
            if (cell == null) {
              return <View key={index} style={{ width: cellWidth, height: cellHeight }} />;
            }
            const date = toIsoDate(cell.date);
            return (
              <View key={index}>
                {renderDay({
                  date,
                  dayOfMonth: cell.date.getDate(),
                  isToday: date === today,
                  size: cellWidth,
                  height: cellHeight,
                  isOutsideMonth: cell.isOutsideMonth,
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
  fillHeight: {
    flex: 1,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    justifyContent: 'space-between',
  },
});
