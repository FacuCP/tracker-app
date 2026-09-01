export interface ParsedRating {
  rating?: number;
  error?: string;
}

/** Interpreta el campo "Rating". Vacío = sin rating. Acepta coma o punto. */
export function parseRating(raw: string): ParsedRating {
  const trimmed = raw.trim().replace(',', '.');
  if (trimmed === '') {
    return {};
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return { error: 'Número inválido' };
  }
  if (value < 0) {
    return { error: 'No puede ser negativo' };
  }
  return { rating: value };
}

/** Cómo se muestra un rating: "8" u "8.5". */
export function formatRating(rating: number): string {
  return String(rating);
}
