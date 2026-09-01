/**
 * Paleta base de la app. Los fondos son claros pero **nunca blancos puros**:
 * el fondo de pantalla (y el header) es un gris azulado suave y las cards van
 * un tono por encima, también sin llegar al blanco.
 *
 * Estos valores se usan directo en el navegador y en las pantallas. Los
 * componentes hoja repiten los hex (`#e9ebf2` fondo, `#f8f9fc` card); este
 * archivo es la referencia de la paleta.
 */
export const theme = {
  colors: {
    /** Fondo de las pantallas y del header (claro, no blanco). */
    background: '#e9ebf2',
    header: '#e9ebf2',
    /** Superficie de las cards y hojas modales. */
    card: '#f8f9fc',
    /** Bordes suaves. */
    border: '#e0e3ec',
    /** Texto principal / secundario. */
    text: '#111827',
    textMuted: '#6b7280',
    /** Acento de la app. */
    accent: '#2563eb',
  },
} as const;
