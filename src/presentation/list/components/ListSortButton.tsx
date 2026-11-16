import { ArrowDownAZ, Calendar, Flag } from 'lucide-react-native';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { theme } from '../../../core/theme';
import { ListSort } from '../../../domain/list/entities/ListEntry';

interface Props {
  sort: ListSort;
  onChange: (sort: ListSort) => void;
}

/** Orden en el que se ciclan los criterios al tocar el botón. */
const CYCLE: readonly ListSort[] = ['date', 'alpha', 'rating'];

const ICONS: Record<ListSort, typeof Calendar> = {
  date: Calendar,
  alpha: ArrowDownAZ,
  rating: Flag,
};

/**
 * Botón compacto (un solo ícono, sin texto) para ciclar el orden de las
 * entradas — fecha → A-Z → prioridad/rating → fecha... El ícono representa
 * el criterio activo. Se usa en Favoritos, donde no entra el selector
 * segmentado completo (`ListSortSelector`, en el detalle de la lista).
 */
export function ListSortButton({ sort, onChange }: Props) {
  const Icon = ICONS[sort];

  function cycle() {
    const next = CYCLE[(CYCLE.indexOf(sort) + 1) % CYCLE.length];
    onChange(next);
  }

  return (
    <TouchableOpacity onPress={cycle} hitSlop={8} style={styles.button}>
      <Icon size={18} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 28,
    alignItems: 'center',
  },
});
