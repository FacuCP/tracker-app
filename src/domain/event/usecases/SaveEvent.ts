import { IsoDate } from '../../../core/utils/date';
import {
  CalendarEvent,
  EventRepeatEndType,
  EventRepeatUnit,
  createCalendarEvent,
} from '../entities/CalendarEvent';
import { EventRepository } from '../repositories/EventRepository';

export interface SaveEventInput {
  /** Si viene, se edita ese evento; si no, se crea uno nuevo. */
  id?: string;
  name: string;
  description?: string;
  date: IsoDate;
  timeFrom?: string;
  timeTo?: string;
  color: string;
  repeat?: {
    intervalValue: number;
    intervalUnit: EventRepeatUnit;
    endType: EventRepeatEndType;
    endDate?: IsoDate;
    count?: number;
  };
}

/** Crea o actualiza un evento del calendario. */
export class SaveEvent {
  constructor(
    private readonly repository: EventRepository,
    private readonly generateId: () => string,
  ) {}

  async execute(input: SaveEventInput): Promise<CalendarEvent> {
    // Al editar, las ocurrencias puntuales borradas ("solo este día") no se
    // tocan desde este formulario — hay que preservarlas explícitamente.
    const existing = input.id ? await this.repository.getById(input.id) : null;

    const event = createCalendarEvent({
      id: input.id ?? this.generateId(),
      name: input.name,
      description: input.description,
      date: input.date,
      timeFrom: input.timeFrom,
      timeTo: input.timeTo,
      color: input.color,
      repeat: input.repeat,
      excludedDates: existing?.excludedDates,
    });
    await this.repository.save(event);
    return event;
  }
}
