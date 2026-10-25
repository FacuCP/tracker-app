import { IsoDate } from '../../../core/utils/date';
import {
  CalendarEvent,
  EventRepeatEndType,
  EventRepeatUnit,
  createCalendarEvent,
} from '../../../domain/event/entities/CalendarEvent';

export interface EventRepeatDto {
  intervalValue: number;
  intervalUnit: EventRepeatUnit;
  endType: EventRepeatEndType;
  endDate?: string;
  count?: number;
}

export interface EventDto {
  id: string;
  name: string;
  description?: string;
  date: string;
  timeFrom?: string;
  timeTo?: string;
  color: string;
  repeat?: EventRepeatDto;
  excludedDates?: string[];
}

export function eventToDto(event: CalendarEvent): EventDto {
  return {
    id: event.id,
    name: event.name,
    description: event.description,
    date: event.date,
    timeFrom: event.timeFrom,
    timeTo: event.timeTo,
    color: event.color,
    repeat: event.repeat
      ? {
          intervalValue: event.repeat.intervalValue,
          intervalUnit: event.repeat.intervalUnit,
          endType: event.repeat.endType,
          endDate: event.repeat.endDate,
          count: event.repeat.count,
        }
      : undefined,
    excludedDates: event.excludedDates ? [...event.excludedDates] : undefined,
  };
}

export function eventFromDto(dto: EventDto): CalendarEvent {
  // Compat con datos viejos: antes había un solo `time` obligatorio, que
  // ahora pasa a ser el `timeFrom` (si el evento ya tenía `timeFrom` propio,
  // ese gana).
  const legacyTime = (dto as EventDto & { time?: string }).time;
  // Compat con datos viejos: antes la repetición solo tenía `intervalDays`
  // (siempre en días, sin unidad).
  const legacyIntervalDays = (dto.repeat as (EventRepeatDto & { intervalDays?: number }) | undefined)
    ?.intervalDays;

  return createCalendarEvent({
    id: dto.id,
    name: dto.name,
    description: dto.description,
    date: dto.date as IsoDate,
    timeFrom: dto.timeFrom ?? legacyTime,
    timeTo: dto.timeTo,
    color: dto.color,
    repeat: dto.repeat
      ? {
          intervalValue: dto.repeat.intervalValue ?? legacyIntervalDays ?? 1,
          intervalUnit: dto.repeat.intervalUnit ?? 'days',
          endType: dto.repeat.endType,
          endDate: dto.repeat.endDate as IsoDate | undefined,
          count: dto.repeat.count,
        }
      : undefined,
    excludedDates: dto.excludedDates as IsoDate[] | undefined,
  });
}
