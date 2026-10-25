import { ReactNode } from 'react';

import { IsoDate } from '../../core/utils/date';

export interface CalendarDay {
  date: IsoDate;
  dayOfMonth: number;
  isToday: boolean;
  /** Ancho de la celda en px, ya calculado por el layout (celdas cuadradas: también el alto). */
  size: number;
  /** Alto de la celda en px, si es distinto del ancho (celdas no cuadradas, ver `cellAspectRatio` en `fitHeight`). Si no viene, la celda es cuadrada (alto = `size`). */
  height?: number;
  /** true si el día pertenece al mes anterior/siguiente (relleno de semana completa en `CalendarMonth`). */
  isOutsideMonth?: boolean;
}

/** Cada feature decide cómo pinta un día (mood, tracker de opciones, número...). */
export type DayRenderer = (day: CalendarDay) => ReactNode;
