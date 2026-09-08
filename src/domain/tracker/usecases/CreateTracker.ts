import { todayIso } from '../../../core/utils/date';
import { Tracker, createTracker } from '../entities/Tracker';
import { TrackerRepository } from '../repositories/TrackerRepository';
import { TrackerDraft, draftOptionsToEntities } from './TrackerDraft';

/** Crea un tracker nuevo a partir de lo que cargó el usuario. */
export class CreateTracker {
  constructor(
    private readonly repository: TrackerRepository,
    private readonly generateId: () => string,
  ) {}

  async execute(draft: TrackerDraft): Promise<Tracker> {
    const tracker = createTracker({
      id: this.generateId(),
      name: draft.name,
      options:
        draft.options.length > 0
          ? draftOptionsToEntities(draft.options, this.generateId)
          : [],
      hasCounter: draft.hasCounter,
      createdAt: todayIso(),
      favorite: draft.favorite,
    });
    await this.repository.save(tracker);
    return tracker;
  }
}
