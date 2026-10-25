import { CalendarEvent } from '../../../domain/event/entities/CalendarEvent';
import { EventRepository } from '../../../domain/event/repositories/EventRepository';
import { EventLocalDataSource } from '../datasources/EventLocalDataSource';
import { eventFromDto, eventToDto } from '../dto/EventDto';

export class EventRepositoryImpl implements EventRepository {
  constructor(private readonly local: EventLocalDataSource) {}

  async getAll(): Promise<CalendarEvent[]> {
    const all = await this.local.readAll();
    return Object.values(all).map(eventFromDto);
  }

  async getById(id: string): Promise<CalendarEvent | null> {
    const all = await this.local.readAll();
    const dto = all[id];
    return dto ? eventFromDto(dto) : null;
  }

  async save(event: CalendarEvent): Promise<void> {
    await this.local.write(eventToDto(event));
  }

  async delete(id: string): Promise<void> {
    await this.local.remove(id);
  }
}
