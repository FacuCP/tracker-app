import { ReactNode } from 'react';

import { IsoDate } from '../../core/utils/date';

export interface CalendarDay {
  date: IsoDate;
  dayOfMonth: number;
  isToday: boolean;
  /** Lado de la celda en px, ya calculado por el layout. */
  size: number;
}

/** Cada feature decide cómo pinta un día (mood, tracker de opciones, número...). */
export type DayRenderer = (day: CalendarDay) => ReactNode;
