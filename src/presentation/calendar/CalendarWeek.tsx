import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

import { addDays, startOfWeek, toIsoDate, todayIso } from '../../core/utils/date';
import { DayRenderer } from './types';

interface Props {
  anchor: Date;
  renderDay: DayRenderer;
  /**
   * Si viene en true, además de repartir el ancho en 7 columnas, la celda se
   * achica o agranda para que la semana entre en el alto disponible sin
   * scroll. Requiere que el componente viva en un contenedor de alto fijo
   * (p. ej. `flex: 1` dentro de un alto ya determinado, no un `ScrollView`
   * cuyo alto depende de su contenido).
   */
  fitHeight?: boolean;
  /** Relación alto/ancho de cada celda (celda más alta que ancha = > 1), para el cálculo de `fitHeight`. Por defecto 1 (cuadrada). */
  cellAspectRatio?: number;
  /** Espacio entre celdas, en px. Por defecto 8. */
  gap?: number;
}

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DEFAULT_GAP = 8;

/** Layout de una semana (lunes a domingo). No sabe qué se pinta en cada día. */
export function CalendarWeek({
  anchor,
  renderDay,
  fitHeight = false,
  cellAspectRatio = 1,
  gap: GAP = DEFAULT_GAP,
}: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [headerHeight, setHeaderHeight] = useState(0);
  const start = startOfWeek(anchor);
  const today = todayIso();

  const { width, height } = size;
  // El ancho de la celda siempre sale de repartir el ancho disponible en 7
  // columnas — nunca se achica por falta de alto, para que las celdas queden
  // siempre pegadas unas a otras sin espacio libre a los costados.
  const cellWidth = width > 0 ? Math.floor((width - GAP * 6) / 7) : 0;

  // El alto, en cambio, sí se adapta: lo natural (ancho × relación) si entra,
  // o lo que quepa en el alto disponible si no.
  let cellHeight = cellWidth * cellAspectRatio;
  if (fitHeight && height > 0 && headerHeight > 0) {
    // `headerHeight` no incluye su propio `marginBottom` (no es parte de su layout box).
    const gridHeight = height - headerHeight - GAP;
    cellHeight = Math.min(cellHeight, gridHeight);
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
      <View style={[styles.row, { marginBottom: GAP }]} onLayout={onHeaderLayout}>
        {WEEKDAY_LABELS.map((label, i) => (
          <Text key={i} style={[styles.label, { width: cellWidth || undefined }]}>
            {label}
          </Text>
        ))}
      </View>

      {cellWidth > 0 ? (
        <View style={[styles.row, { marginBottom: GAP }]}>
          {Array.from({ length: 7 }, (_, i) => {
            const dayDate = addDays(start, i);
            const date = toIsoDate(dayDate);
            return (
              <View key={date}>
                {renderDay({
                  date,
                  dayOfMonth: dayDate.getDate(),
                  isToday: date === today,
                  size: cellWidth,
                  height: cellHeight,
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    textAlign: 'center',
    fontWeight: '700',
    color: '#6b7280',
    fontSize: 12,
  },
});
