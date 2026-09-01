import { useCallback, useMemo, useState } from 'react';

import {
  addDays,
  addMonths,
  addYears,
  capitalize,
  endOfMonth,
  endOfWeek,
  endOfYear,
  formatMonthTitle,
  formatWeekRange,
  IsoDate,
  startOfMonth,
  startOfWeek,
  startOfYear,
  toIsoDate,
} from '../../core/utils/date';

export type CalendarView = 'week' | 'month' | 'year';

export interface CalendarRange {
  startIso: IsoDate;
  endIso: IsoDate;
  title: string;
}

function rangeFor(view: CalendarView, anchor: Date): CalendarRange {
  switch (view) {
    case 'week': {
      const start = startOfWeek(anchor);
      const end = endOfWeek(anchor);
      return { startIso: toIsoDate(start), endIso: toIsoDate(end), title: formatWeekRange(start, end) };
    }
    case 'month':
      return {
        startIso: toIsoDate(startOfMonth(anchor)),
        endIso: toIsoDate(endOfMonth(anchor)),
        title: capitalize(formatMonthTitle(anchor.getFullYear(), anchor.getMonth())),
      };
    case 'year':
      return {
        startIso: toIsoDate(startOfYear(anchor)),
        endIso: toIsoDate(endOfYear(anchor)),
        title: String(anchor.getFullYear()),
      };
  }
}

function shiftAnchor(view: CalendarView, anchor: Date, direction: 1 | -1): Date {
  if (view === 'week') return addDays(anchor, 7 * direction);
  if (view === 'month') return addMonths(anchor, direction);
  return addYears(anchor, direction);
}

/**
 * Estado compartido de "qué período estoy mirando" para las pantallas de
 * progreso (mood y trackers). Guarda solo `view` + `anchor` y deriva el rango,
 * el título y la navegación.
 */
export function useCalendarPeriod() {
  const [view, setView] = useState<CalendarView>('month');
  const [anchor, setAnchor] = useState<Date>(() => new Date());

  const range = useMemo(() => rangeFor(view, anchor), [view, anchor]);

  const goToPrevious = useCallback(() => setAnchor((a) => shiftAnchor(view, a, -1)), [view]);
  const goToNext = useCallback(() => setAnchor((a) => shiftAnchor(view, a, 1)), [view]);
  const showMonth = useCallback((year: number, month: number) => {
    setAnchor(new Date(year, month, 1));
    setView('month');
  }, []);

  return { view, setView, anchor, range, goToPrevious, goToNext, showMonth };
}

/** Etiqueta corta del período, para textos como "en el mes". */
export function periodNoun(view: CalendarView): string {
  if (view === 'week') return 'la semana';
  if (view === 'month') return 'el mes';
  return 'el año';
}
