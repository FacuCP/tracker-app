import { Pencil, Trash, X } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '../../core/theme';

interface Props {
  count: number;
  onCancel: () => void;
  onDelete: () => void;
  /** Si viene, muestra un lápiz antes del tacho — pensado para cuando hay exactamente un ítem seleccionado (quien la usa decide cuándo pasarlo). */
  onEdit?: () => void;
}

/**
 * Reemplaza el encabezado normal de una lista de ítems mientras hay una
 * selección múltiple activa (se empieza con mantener presionado un ítem).
 * La "X" cancela la selección sin borrar nada; el tacho borra los
 * seleccionados (quien la usa se encarga de confirmar antes); el lápiz
 * (opcional, solo con `onEdit`) edita el único seleccionado.
 */
export function SelectionBar({ count, onCancel, onDelete, onEdit }: Props) {
  return (
    <View style={styles.bar}>
      <TouchableOpacity onPress={onCancel} hitSlop={10} activeOpacity={0.6}>
        <X size={20} color={theme.colors.textMuted} />
      </TouchableOpacity>
      <Text style={styles.count}>
        {count} {count === 1 ? 'seleccionada' : 'seleccionadas'}
      </Text>
      <View style={styles.actions}>
        {onEdit ? (
          <TouchableOpacity onPress={onEdit} hitSlop={10} activeOpacity={0.6}>
            <Pencil size={20} color={theme.colors.accent} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={onDelete} hitSlop={10} activeOpacity={0.6}>
          <Trash size={20} color="#dc2626" />
        </TouchableOpacity>
      </View>
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
});
