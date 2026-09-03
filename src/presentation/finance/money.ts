/** Formato de plata estilo es-AR: "$ 1.234,50" (o "-$ 1.234,50"). */
export function formatMoney(amount: number): string {
  const negative = amount < 0;
  const [intPart, decPart] = Math.abs(amount).toFixed(2).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}$ ${grouped},${decPart}`;
}

/** Igual que `formatMoney` pero con signo explícito (+ / -) para ingresos y gastos. */
export function formatSignedMoney(amount: number, kind: 'income' | 'expense'): string {
  const sign = kind === 'income' ? '+' : '-';
  return `${sign}${formatMoney(Math.abs(amount))}`;
}

export interface ParsedAmount {
  amount?: number;
  error?: string;
}

/**
 * Interpreta el campo "Monto". Los puntos son separadores de miles y la coma
 * el separador decimal (formato es-AR). Tiene que ser > 0.
 */
export function parseAmount(raw: string): ParsedAmount {
  const cleaned = raw.replace(/[^\d,]/g, '').replace(',', '.');
  if (cleaned === '' || cleaned === '.') {
    return { error: 'Poné un monto' };
  }
  const value = Number(cleaned);
  if (!Number.isFinite(value)) {
    return { error: 'Monto inválido' };
  }
  if (value <= 0) {
    return { error: 'Tiene que ser mayor a 0' };
  }
  return { amount: value };
}

/**
 * Formatea lo que el usuario va tipeando en el campo de monto, en vivo:
 * agrega el signo "$", los puntos de miles y deja la coma como decimal (2
 * dígitos como máximo). Devuelve "" si todavía no hay nada.
 */
export function formatAmountInput(raw: string): string {
  const onlyDigitsAndComma = raw.replace(/[^\d,]/g, '');
  const firstComma = onlyDigitsAndComma.indexOf(',');

  let intDigits: string;
  let decDigits: string | undefined;
  if (firstComma === -1) {
    intDigits = onlyDigitsAndComma;
  } else {
    intDigits = onlyDigitsAndComma.slice(0, firstComma).replace(/,/g, '');
    decDigits = onlyDigitsAndComma
      .slice(firstComma + 1)
      .replace(/,/g, '')
      .slice(0, 2);
  }

  intDigits = intDigits.replace(/^0+(?=\d)/, '');
  if (intDigits === '' && decDigits === undefined) {
    return '';
  }

  const grouped = (intDigits || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decDigits === undefined ? `$ ${grouped}` : `$ ${grouped},${decDigits}`;
}

/** Valor inicial del campo de monto a partir de un número guardado. */
export function amountInputFromNumber(amount: number): string {
  const [intPart, decPart] = amount.toFixed(2).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decPart === '00' ? `$ ${grouped}` : `$ ${grouped},${decPart}`;
}
