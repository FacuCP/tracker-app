import { TrackerKind, TrackerOption } from '../entities/Tracker';

/** Datos que manda la UI para crear o editar un tracker. */
export interface TrackerOptionDraft {
  /** Si viene, se conserva la opción existente; si no, es nueva. */
  id?: string;
  label: string;
  color: string;
}

export interface TrackerDraft {
  name: string;
  kind: TrackerKind;
  options: TrackerOptionDraft[];
}

export function draftOptionsToEntities(
  drafts: TrackerOptionDraft[],
  generateId: () => string,
): TrackerOption[] {
  return drafts.map((draft) => ({
    id: draft.id ?? generateId(),
    label: draft.label,
    color: draft.color,
  }));
}
