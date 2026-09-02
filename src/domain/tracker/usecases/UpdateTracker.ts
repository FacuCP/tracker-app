import { Tracker, createTracker } from '../entities/Tracker';
import { TrackerRepository } from '../repositories/TrackerRepository';
import { TrackerDraft, draftOptionsToEntities } from './TrackerDraft';

/**
 * Edita un tracker existente: nombre, tipo y opciones. Conserva su id y su
 * fecha de creación. Las opciones sin id se tratan como nuevas.
 */
export class UpdateTracker {
  constructor(
    private readonly repository: TrackerRepository,
    private readonly generateId: () => string,
  ) {}

  async execute(id: string, draft: TrackerDraft): Promise<Tracker> {
    const existing = await this.repository.getById(id);
    if (!existing) {
      throw new Error('El tracker no existe');
    }

    const tracker = createTracker({
      id: existing.id,
      name: draft.name,
      kind: draft.kind,
      options:
        draft.kind === 'options'
          ? draftOptionsToEntities(draft.options, this.generateId)
          : [],
      createdAt: existing.createdAt,
      favorite: draft.favorite,
    });
    await this.repository.save(tracker);
    return tracker;
  }
}
