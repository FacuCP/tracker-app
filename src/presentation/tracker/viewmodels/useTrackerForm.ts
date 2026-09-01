import { useMemo, useState } from 'react';

import { generateId } from '../../../core/utils/id';
import {
  DEFAULT_OPTIONS,
  MAX_OPTIONS,
  MAX_TRACKER_NAME,
  MIN_OPTIONS,
  Tracker,
  TrackerKind,
} from '../../../domain/tracker/entities/Tracker';
import { TrackerDraft } from '../../../domain/tracker/usecases/TrackerDraft';
import { OPTION_COLORS } from '../components/OptionColorPicker';

export interface OptionRow {
  /** Clave estable para la lista de React (no es el id de dominio). */
  key: string;
  /** Id de dominio si la opción ya existía. */
  id?: string;
  label: string;
  color: string;
}

function defaultRows(): OptionRow[] {
  return DEFAULT_OPTIONS.map((o) => ({ key: generateId(), label: o.label, color: o.color }));
}

/**
 * ViewModel del formulario de tracker (crear y editar comparten este hook).
 */
export function useTrackerForm(initial?: Tracker | null) {
  const [name, setName] = useState(initial?.name ?? '');
  const [kind, setKind] = useState<TrackerKind>(initial?.kind ?? 'options');
  const [options, setOptions] = useState<OptionRow[]>(
    initial && initial.kind === 'options'
      ? initial.options.map((o) => ({ key: o.id, id: o.id, label: o.label, color: o.color }))
      : defaultRows(),
  );

  function addOption() {
    setOptions((rows) => {
      if (rows.length >= MAX_OPTIONS) return rows;
      const usedColors = new Set(rows.map((r) => r.color));
      const nextColor = OPTION_COLORS.find((c) => !usedColors.has(c)) ?? OPTION_COLORS[0];
      return [...rows, { key: generateId(), label: '', color: nextColor }];
    });
  }

  function removeOption(key: string) {
    setOptions((rows) => (rows.length <= MIN_OPTIONS ? rows : rows.filter((r) => r.key !== key)));
  }

  function updateOption(key: string, patch: Partial<Pick<OptionRow, 'label' | 'color'>>) {
    setOptions((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  const nameError = useMemo(() => {
    const trimmed = name.trim();
    if (trimmed.length === 0) return 'Poné un nombre';
    if (trimmed.length > MAX_TRACKER_NAME) return `Máximo ${MAX_TRACKER_NAME} caracteres`;
    return undefined;
  }, [name]);

  const optionsError = useMemo(() => {
    if (kind !== 'options') return undefined;
    if (options.some((o) => o.label.trim().length === 0)) return 'Todas las opciones necesitan nombre';
    return undefined;
  }, [kind, options]);

  const canSave = !nameError && !optionsError;

  function toDraft(): TrackerDraft {
    return {
      name,
      kind,
      options:
        kind === 'options'
          ? options.map((o) => ({ id: o.id, label: o.label, color: o.color }))
          : [],
    };
  }

  return {
    name,
    setName,
    kind,
    setKind,
    options,
    addOption,
    removeOption,
    updateOption,
    canAddOption: options.length < MAX_OPTIONS,
    canRemoveOption: options.length > MIN_OPTIONS,
    nameError,
    optionsError,
    canSave,
    toDraft,
  };
}
