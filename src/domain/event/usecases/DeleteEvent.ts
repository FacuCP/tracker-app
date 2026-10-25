import { EventRepository } from '../repositories/EventRepository';

/** Borra un evento del calendario (y todas sus ocurrencias futuras, si se repetía). */
export class DeleteEvent {
  constructor(private readonly repository: EventRepository) {}

  async execute(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
