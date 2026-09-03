/**
 * Categoría de un movimiento de finanzas. Tiene un color y se puede
 * crear / editar / borrar. Si el usuario no tiene ninguna categoría propia, o
 * un movimiento no tiene categoría (o la suya fue borrada), cae en la categoría
 * sintética "General".
 */
export interface FinanceCategory {
  readonly id: string;
  readonly name: string;
  /** Color hex con el que se muestra la categoría. */
  readonly color: string;
}

export const MAX_CATEGORY_NAME = 24;

export const GENERAL_CATEGORY_ID = 'general';

/** Categoría por defecto para los movimientos sin categoría. No se persiste. */
export const GENERAL_CATEGORY: FinanceCategory = {
  id: GENERAL_CATEGORY_ID,
  name: 'General',
  color: '#9AA0A6',
};

/** Categorías que se crean la primera vez que se usa Finanzas. */
export const DEFAULT_FINANCE_CATEGORIES: readonly { name: string; color: string }[] = [
  { name: 'Personales', color: '#3B82F6' },
  { name: 'Servicios', color: '#F5A623' },
  { name: 'Compras', color: '#8B5CF6' },
];

function isHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

export function createFinanceCategory(params: {
  id: string;
  name: string;
  color: string;
}): FinanceCategory {
  const name = params.name.trim();
  if (name.length === 0) {
    throw new Error('La categoría necesita un nombre');
  }
  if (name.length > MAX_CATEGORY_NAME) {
    throw new Error(`El nombre no puede superar los ${MAX_CATEGORY_NAME} caracteres`);
  }
  if (params.id === GENERAL_CATEGORY_ID) {
    throw new Error('Ese id está reservado');
  }
  if (!isHexColor(params.color)) {
    throw new Error(`Color inválido: ${params.color}`);
  }
  return { id: params.id, name, color: params.color };
}
