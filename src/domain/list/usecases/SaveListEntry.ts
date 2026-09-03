import { IsoDate } from '../../../core/utils/date';
import { ListEntry, createListEntry } from '../entities/ListEntry';
import { ListEntryRepository } from '../repositories/ListEntryRepository';
import { ListRepository } from '../repositories/ListRepository';

export interface SaveListEntryInput {
  /** Si viene, se edita esa entrada; si no, se crea una nueva. */
  id?: string;
  listId: string;
  name: string;
  date?: IsoDate | null;
  comment?: string;
  rating?: number;
  done?: boolean;
}

/** Crea o actualiza una entrada de una lista. */
export class SaveListEntry {
  constructor(
    private readonly lists: ListRepository,
    private readonly entries: ListEntryRepository,
    private readonly generateId: () => string,
  ) {}

  async execute(input: SaveListEntryInput): Promise<ListEntry> {
    const list = await this.lists.getById(input.listId);
    if (!list) {
      throw new Error('La lista no existe');
    }

    const entry = createListEntry({
      id: input.id ?? this.generateId(),
      listId: input.listId,
      name: input.name,
      date: input.date,
      comment: input.comment,
      rating: input.rating,
      done: input.done,
    });
    await this.entries.saveEntry(entry);
    return entry;
  }
}
