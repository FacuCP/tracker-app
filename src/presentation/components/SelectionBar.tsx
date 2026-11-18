import { Copy, FolderPlus, Pencil, Star, Trash, X } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '../../core/theme';

interface Props {
  count: number;
  onCancel: () => void;
  onDelete: () => void;
  /** Si viene, muestra un lápiz antes del tacho — pensado para cuando hay exactamente un ítem seleccionado (quien la usa decide cuándo pasarlo). */
  onEdit?: () => void;
  /** Si viene, muestra un ícono de copiar — a diferencia de `onEdit`, tiene sentido con 1 o más seleccionados. */
  onCopy?: () => void;
  /** Si viene, muestra un ícono para elegir a qué anotaciones pertenecen los seleccionados (agregar/quitar en un solo lugar, Anotaciones). */
  onAddToNote?: () => void;
  /** Si viene, muestra una estrella (a la derecha del lápiz) para marcar/desmarcar como favorito. */
  onFavorite?: () => void;
  /** La estrella se ve llena (todos los seleccionados ya son favoritos). */
  favoriteActive?: boolean;
}

/**
 * Reemplaza el encabezado normal de una lista de ítems mientras hay una
 * selección múltiple activa (se empieza con mantener presionado un ítem).
 * La "X" cancela la selección sin borrar nada; el tacho borra los
 * seleccionados (quien la usa se encarga de confirmar antes); el lápiz
 * (opcional, solo con `onEdit`) edita el único seleccionado; el resto de
 * las acciones son opcionales y las decide quien usa la barra.
 */
export function SelectionBar({ count, onCancel, onDelete, onEdit, onCopy, onAddToNote, onFavorite, favoriteActive }: Props) {
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
        {onFavorite ? (
          <TouchableOpacity onPress={onFavorite} hitSlop={10} activeOpacity={0.6}>
            <Star
              size={20}
              color={favoriteActive ? '#f59e0b' : theme.colors.accent}
              fill={favoriteActive ? '#f59e0b' : 'none'}
            />
          </TouchableOpacity>
        ) : null}
        {onCopy ? (
          <TouchableOpacity onPress={onCopy} hitSlop={10} activeOpacity={0.6}>
            <Copy size={20} color={theme.colors.accent} />
          </TouchableOpacity>
        ) : null}
        {onAddToNote ? (
          <TouchableOpacity onPress={onAddToNote} hitSlop={10} activeOpacity={0.6}>
            <FolderPlus size={20} color={theme.colors.accent} />
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
