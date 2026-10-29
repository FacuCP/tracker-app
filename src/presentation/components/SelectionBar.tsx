import { Trash, X } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '../../core/theme';

interface Props {
  count: number;
  onCancel: () => void;
  onDelete: () => void;
}

/**
 * Reemplaza el encabezado normal de una lista de ítems mientras hay una
 * selección múltiple activa (se empieza con mantener presionado un ítem).
 * La "X" cancela la selección sin borrar nada; el tacho borra los
 * seleccionados (quien la usa se encarga de confirmar antes).
 */
export function SelectionBar({ count, onCancel, onDelete }: Props) {
  return (
    <View style={styles.bar}>
      <TouchableOpacity onPress={onCancel} hitSlop={10} activeOpacity={0.6}>
        <X size={20} color={theme.colors.textMuted} />
      </TouchableOpacity>
      <Text style={styles.count}>
        {count} {count === 1 ? 'seleccionada' : 'seleccionadas'}
      </Text>
      <TouchableOpacity onPress={onDelete} hitSlop={10} activeOpacity={0.6}>
        <Trash size={20} color="#dc2626" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  count: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
});
