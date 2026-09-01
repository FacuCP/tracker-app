/**
 * Utilidades de fecha. Trabajamos siempre con "fechas de calendario" en
 * formato ISO corto (YYYY-MM-DD) y en hora local, para que un día sea el
 * mismo sin importar la zona horaria.
 */

export type IsoDate = string; // "2026-09-01"

export function toIsoDate(date: Date): IsoDate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayIso(): IsoDate {
  return toIsoDate(new Date());
}

export function fromIsoDate(iso: IsoDate): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Fecha "pelada" (sin hora) a partir de otra. */
export function atMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// --- Aritmética ---

export function addDays(date: Date, amount: number): Date {
  const d = atMidnight(date);
  d.setDate(d.getDate() + amount);
  return d;
}

export function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function addYears(date: Date, amount: number): Date {
  return new Date(date.getFullYear() + amount, 0, 1);
}

// --- Inicio / fin de período (la semana empieza en lunes) ---

export function startOfWeek(date: Date): Date {
  const d = atMidnight(date);
  const weekday = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - weekday);
  return d;
}

export function endOfWeek(date: Date): Date {
  return addDays(startOfWeek(date), 6);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

export function endOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 11, 31);
}

// --- Formateo en español ---

const WEEKDAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const MONTHS_SHORT_ES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

export function formatLongDate(iso: IsoDate): string {
  const date = fromIsoDate(iso);
  return `${WEEKDAYS_ES[date.getDay()]} ${date.getDate()} de ${MONTHS_ES[date.getMonth()]}`;
}

export function formatMonthTitle(year: number, month: number): string {
  return `${MONTHS_ES[month]} ${year}`;
}

/** "4 sep" */
export function formatDayShortMonth(date: Date): string {
  return `${date.getDate()} ${MONTHS_SHORT_ES[date.getMonth()]}`;
}

/** "28 sep – 4 oct 2026" */
export function formatWeekRange(start: Date, end: Date): string {
  return `${formatDayShortMonth(start)} – ${formatDayShortMonth(end)} ${end.getFullYear()}`;
}

/** "01/09/2026" a partir de una fecha ISO "2026-09-01". */
export function formatDdMmYyyy(iso: IsoDate): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

export function capitalize(text: string): string {
  return text.length === 0 ? text : text.charAt(0).toUpperCase() + text.slice(1);
}

export { MONTHS_ES, MONTHS_SHORT_ES, WEEKDAYS_ES };
